import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
} from '../application/movements.port';
import type { LedgerListTransactionsResult, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { MovementsLedgerReader } from '../application/movementsReaderPorts';
import { filterExpectedMovements } from '../../expected/application/expectedMovementFilters';
import { filterScheduledMovements } from '../../scheduling/application/scheduledMovementFilters';
import type { WebAppState } from '../../core/infrastructure/webAppState';

export type WebMovementsOverviewServiceOptions = {
  state: WebAppState;
  ledger: MovementsLedgerReader;
};

export class WebMovementsOverviewService {
  private readonly state: WebAppState;

  private readonly ledger: MovementsLedgerReader;

  constructor(options: WebMovementsOverviewServiceOptions) {
    this.state = options.state;
    this.ledger = options.ledger;
  }

  async getMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    const expectedPreviewSize = input.expectedPreviewSize != null && input.expectedPreviewSize > 0
      ? Math.min(Math.trunc(input.expectedPreviewSize), 20)
      : 5;
    const fromDate = input.fromDate ?? input.filters?.fromDate;
    const toDate = input.toDate ?? input.filters?.toDate;

    const accountIds = input.accountId ? [input.accountId] : this.state.ledgerAccounts
      .map((account) => account.id);
    const scheduledFiltered = uniqueById(accountIds.flatMap((accountId) => filterScheduledMovements(this.state.recurringMovements, {
      accountId,
      filters: {
        fromDate,
        toDate,
      },
    })));
    const expectedFiltered = uniqueById(accountIds.flatMap((accountId) => filterExpectedMovements(this.state.expectedMovements, {
      accountId,
      filters: {
        fromDate,
        toDate,
      },
    }))).sort((left, right) => {
      const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
      return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
    });

    const postedPage = input.accountId ? await this.ledger.listTransactions({
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
        statuses: ['posted'],
      },
      pagination: input.postedPagination ?? input.executedPagination,
      sort: input.sort ?? [{ field: 'occurredAt', direction: 'desc' }],
    }) : await this.listTransactionsAcrossAccounts(accountIds, input, fromDate, toDate);

    return {
      scheduledPreview: {
        items: scheduledFiltered,
        total: scheduledFiltered.length,
        hasMore: false,
      },
      expectedPreview: {
        items: expectedFiltered.slice(0, expectedPreviewSize),
        total: expectedFiltered.length,
        hasMore: expectedFiltered.length > expectedPreviewSize,
      },
      postedPage,
      executedPage: postedPage,
    };
  }

  async getOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.getMonthOverview(input);
  }

  private async listTransactionsAcrossAccounts(
    accountIds: string[],
    input: MovementsMonthOverviewInput,
    fromDate?: string,
    toDate?: string,
  ): Promise<LedgerListTransactionsResult> {
    const pageRequest = input.postedPagination ?? input.executedPagination;
    const requestedPage = pageRequest?.page ?? 0;
    const requestedSize = pageRequest?.size ?? 100;
    const pages = await Promise.all(accountIds.map((accountId) => this.ledger.listTransactions({
      accountId,
      filters: {
        fromDate,
        toDate,
        statuses: ['posted'],
      },
      pagination: {
        page: 0,
        size: requestedSize,
      },
      sort: input.sort ?? [{ field: 'occurredAt', direction: 'desc' }],
    })));
    const sorted = pages
      .flatMap((page) => page.content)
      .sort(compareTransactions(input.sort?.[0]?.direction ?? 'desc'));
    const totalElements = sorted.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / requestedSize);
    const page = totalPages === 0 ? 0 : Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * requestedSize;
    const content = sorted.slice(start, start + requestedSize);

    return {
      content,
      page,
      size: requestedSize,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && page + 1 < totalPages,
      hasPrevious: page > 0,
    };
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function compareTransactions(direction: 'asc' | 'desc') {
  return (left: LedgerTransactionListItem, right: LedgerTransactionListItem) => {
    const comparison = left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id);
    return direction === 'asc' ? comparison : -comparison;
  };
}
