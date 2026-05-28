import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
} from '../application/movements.port';
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

    const postedPage = await this.ledger.listTransactions({
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
        statuses: ['posted'],
      },
      pagination: input.postedPagination ?? input.executedPagination,
      sort: input.sort ?? [{ field: 'occurredAt', direction: 'desc' }],
    });

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
}
