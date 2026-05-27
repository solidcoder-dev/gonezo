import type {
  MovementsSearchInput,
  MovementsSearchResult,
} from '../../domain/corePort';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import {
  filterExpectedMovements,
  mapExpectedMovementToSearchItem,
  mapPostedTransactionToSearchItem,
  mapScheduledMovementToSearchItem,
} from './coreAdapterWebMovementQueries';
import { normalizeWebPagination, paginateWebItems } from './coreAdapterWebPagination';
import type { WebScheduledMovementsListService } from './coreAdapterWebScheduledMovementsListService';
import type { WebCoreState } from './coreAdapterWebState';
import type { WebMovementsTaxonomyPort } from './coreAdapterWebTaxonomyService';

export type WebMovementsSearchServiceOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
  taxonomy: WebMovementsTaxonomyPort;
  scheduledList: WebScheduledMovementsListService;
};

export class WebMovementsSearchService {
  private readonly state: WebCoreState;

  private readonly ledger: WebLedgerService;

  private readonly taxonomy: WebMovementsTaxonomyPort;

  private readonly scheduledList: WebScheduledMovementsListService;

  constructor(options: WebMovementsSearchServiceOptions) {
    this.state = options.state;
    this.ledger = options.ledger;
    this.taxonomy = options.taxonomy;
    this.scheduledList = options.scheduledList;
  }

  async search(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    if (input.source === 'posted') {
      return this.searchPosted(input);
    }
    if (input.source === 'expected') {
      return this.searchExpected(input);
    }
    return this.searchScheduled(input);
  }

  private async searchPosted(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    const { page, size } = normalizeWebPagination(input.pagination);
    const filters = input.filters ?? {};
    const result = await this.ledger.listTransactions({
      accountId: input.accountId,
      filters: {
        text: filters.text,
        merchant: filters.merchant,
        categoryId: filters.categoryId,
        categoryIds: filters.categoryIds,
        tagIds: filters.tagIds,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        types: filters.types,
        statuses: ['posted'],
      },
      pagination: {
        page,
        size,
      },
      sort: input.sort?.map((item) => ({
        field: item.field === 'date' ? 'occurredAt' : item.field,
        direction: item.direction,
      })) ?? [{ field: 'occurredAt', direction: 'desc' }],
    });
    return {
      content: result.content.map((transaction) => mapPostedTransactionToSearchItem(transaction)),
      page: result.page,
      size: result.size,
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
    };
  }

  private async searchExpected(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    const filters = input.filters ?? {};
    const sort = input.sort && input.sort.length > 0
      ? input.sort
      : [{ field: 'date' as const, direction: 'desc' as const }];
    const sorted = [...filterExpectedMovements(this.state.expectedMovements, {
      accountId: input.accountId,
      filters,
    })].sort((left, right) => {
      for (const criterion of sort) {
        let comparison = 0;
        if (criterion.field === 'amount') {
          const leftAmount = Number(left.amount);
          const rightAmount = Number(right.amount);
          comparison = (Number.isFinite(leftAmount) ? leftAmount : 0) - (Number.isFinite(rightAmount) ? rightAmount : 0);
        } else {
          comparison = left.expectedAt.localeCompare(right.expectedAt);
        }
        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }
      return right.id.localeCompare(left.id);
    });

    const page = paginateWebItems(sorted, input.pagination);
    return {
      ...page,
      content: page.content.map((movement) => mapExpectedMovementToSearchItem(
        movement,
        (categoryId) => this.taxonomy.categoryNameById(categoryId),
      )),
    };
  }

  private async searchScheduled(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    const { page, size } = normalizeWebPagination(input.pagination);
    const scheduledResult = await this.scheduledList.listScheduled({
      accountId: input.accountId,
      filters: input.filters ?? {},
      pagination: {
        page,
        size,
      },
      sort: input.sort?.map((item) => ({
        field: item.field === 'date' ? 'nextDueAt' : item.field,
        direction: item.direction,
      })) ?? [{ field: 'nextDueAt', direction: 'desc' }],
    });

    return {
      content: scheduledResult.content.map((movement) => mapScheduledMovementToSearchItem(
        movement,
        (categoryId) => this.taxonomy.categoryNameById(categoryId),
      )),
      page: scheduledResult.page,
      size: scheduledResult.size,
      totalElements: scheduledResult.totalElements,
      totalPages: scheduledResult.totalPages,
      hasNext: scheduledResult.hasNext,
      hasPrevious: scheduledResult.hasPrevious,
    };
  }
}
