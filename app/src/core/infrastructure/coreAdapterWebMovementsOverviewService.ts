import type {
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
} from '../../ledger/application/ledgerCore.port';
import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
} from '../../movements/application/movementsCore.port';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import {
  filterExpectedMovements,
  filterScheduledMovements,
} from './coreAdapterWebMovementQueries';
import type { WebCoreState } from './coreAdapterWebState';

export type WebMovementsOverviewServiceOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
};

export class WebMovementsOverviewService {
  private readonly state: WebCoreState;

  private readonly ledger: WebLedgerService;

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

    const scheduledFiltered = filterScheduledMovements(this.state.recurringMovements, {
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
      },
    });
    const expectedFiltered = filterExpectedMovements(this.state.expectedMovements, {
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
      },
    }).sort((left, right) => {
      const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
      return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
    });

    const postedPage = await this.collectPostedPage(input.accountId, fromDate, toDate);

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

  private async collectPostedPage(
    accountId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<LedgerListTransactionsResult> {
    const allPosted: LedgerTransactionListItem[] = [];
    let postedPageIndex = 0;
    let hasMorePosted = true;
    while (hasMorePosted) {
      const pageResult = await this.ledger.listTransactions({
        accountId,
        filters: {
          fromDate,
          toDate,
          statuses: ['posted'],
        },
        pagination: {
          page: postedPageIndex,
          size: 100,
        },
        sort: [
          {
            field: 'occurredAt',
            direction: 'desc',
          },
        ],
      });
      allPosted.push(...pageResult.content);
      hasMorePosted = pageResult.hasNext;
      postedPageIndex += 1;
      if (!hasMorePosted || pageResult.content.length === 0) {
        break;
      }
    }

    return {
      content: allPosted,
      page: 0,
      size: allPosted.length,
      totalElements: allPosted.length,
      totalPages: allPosted.length === 0 ? 0 : 1,
      hasNext: false,
      hasPrevious: false,
    };
  }
}
