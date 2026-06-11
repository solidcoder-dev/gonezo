import { useState } from 'react';
import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { MonthlyMovementsViewRequired } from '../ui/MonthlyMovements/MonthlyMovementsView.contract';
import { filterProjectedScheduledMovements } from './monthlyMovementProjection';

export type MonthlyMovementsPaginationState = MonthlyMovementsViewRequired['state']['pagination'];

export const MONTHLY_MOVEMENTS_PAGE_SIZE = 100;

export const EMPTY_MONTHLY_MOVEMENTS_PAGINATION: MonthlyMovementsPaginationState = {
  page: 0,
  size: MONTHLY_MOVEMENTS_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

type UseMonthlyMovementsOverviewModelInput = {
  scheduling: SchedulingGatewayPort;
  accountId: string | null;
  page: number;
  setPage(page: number): void;
  monthStartDate: Date;
  monthEndDate: Date;
};

export function useMonthlyMovementsOverviewModel(input: UseMonthlyMovementsOverviewModelInput) {
  const {
    scheduling,
    accountId,
    page,
    setPage,
    monthStartDate,
    monthEndDate,
  } = input;

  const [transactions, setTransactions] = useState<LedgerTransactionListItem[]>([]);
  const [scheduledItems, setScheduledItems] = useState<MonthlyMovementsViewRequired['state']['scheduledItems']>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledHasMore, setScheduledHasMore] = useState(false);
  const [expectedItems, setExpectedItems] = useState<MonthlyMovementsViewRequired['state']['expectedItems']>([]);
  const [expectedTotal, setExpectedTotal] = useState(0);
  const [expectedHasMore, setExpectedHasMore] = useState(false);
  const [pagination, setPagination] = useState<MonthlyMovementsPaginationState>(EMPTY_MONTHLY_MOVEMENTS_PAGINATION);

  function reset() {
    setTransactions([]);
    setScheduledItems([]);
    setScheduledTotal(0);
    setScheduledHasMore(false);
    setExpectedItems([]);
    setExpectedTotal(0);
    setExpectedHasMore(false);
    setPagination(EMPTY_MONTHLY_MOVEMENTS_PAGINATION);
  }

  async function refresh(): Promise<LedgerTransactionListItem[]> {
    if (!accountId) {
      reset();
      return [];
    }

    await scheduling.schedulingProcessDueMovements?.();

    const overview = await scheduling.movementsGetOverview({
      accountId,
      filters: {
        fromDate: monthStartDate.toISOString(),
        toDate: monthEndDate.toISOString(),
      },
      executedPagination: {
        page,
        size: MONTHLY_MOVEMENTS_PAGE_SIZE,
      },
      sort: [
        {
          field: 'occurredAt',
          direction: 'desc',
        },
      ],
      expectedPreviewSize: 30,
    });
    const visibleScheduledItems = filterProjectedScheduledMovements(
      overview.scheduledPreview.items,
    );

    setTransactions((previous) => {
      if (overview.executedPage.page === 0) {
        return overview.executedPage.content;
      }
      const knownIds = new Set(previous.map((item) => item.id));
      return [
        ...previous,
        ...overview.executedPage.content.filter((item) => !knownIds.has(item.id)),
      ];
    });
    setScheduledItems(visibleScheduledItems);
    setScheduledTotal(visibleScheduledItems.length);
    setScheduledHasMore(false);
    setExpectedItems(overview.expectedPreview.items);
    setExpectedTotal(overview.expectedPreview.total);
    setExpectedHasMore(overview.expectedPreview.hasMore);
    setPagination({
      page: overview.executedPage.page,
      size: overview.executedPage.size,
      totalElements: overview.executedPage.totalElements,
      totalPages: overview.executedPage.totalPages,
      hasNext: overview.executedPage.hasNext,
      hasPrevious: overview.executedPage.hasPrevious,
    });
    if (page !== overview.executedPage.page) {
      setPage(overview.executedPage.page);
    }
    return overview.executedPage.content;
  }

  return {
    state: {
      transactions,
      scheduledItems,
      scheduledTotal,
      scheduledHasMore,
      expectedItems,
      expectedTotal,
      expectedHasMore,
      pagination,
    },
    actions: {
      reset,
      refresh,
    },
  };
}
