import type {
  MovementsSearchInput,
  MovementsSearchResult,
} from '../application/movements.port';
import { filterExpectedMovements } from '../../expected/application/expectedMovementFilters';
import type {
  MovementsLedgerReader,
  MovementsTaxonomyReader,
} from '../application/movementsReaderPorts';
import {
  mapExpectedMovementToSearchItem,
  mapPostedTransactionToSearchItem,
  mapScheduledMovementToSearchItem,
} from './webMovementQueries';
import { normalizeWebPagination, paginateWebItems } from './webPagination';
import type { WebScheduledMovementsListService } from './webScheduledMovementsListService';
import type { WebAppState } from '../../core/infrastructure/webAppState';

export type WebMovementsSearchServiceOptions = {
  state: WebAppState;
  ledger: MovementsLedgerReader;
  taxonomy: MovementsTaxonomyReader;
  scheduledList: WebScheduledMovementsListService;
};

export class WebMovementsSearchService {
  private readonly state: WebAppState;

  private readonly ledger: MovementsLedgerReader;

  private readonly taxonomy: MovementsTaxonomyReader;

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
    const filters = input.filters ?? {};
    const ledgerFilters = {
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
      statuses: ['posted' as const],
    };
    const sort = input.sort?.map((item) => ({
      field: item.field === 'date' ? 'occurredAt' as const : item.field,
      direction: item.direction,
    })) ?? [{ field: 'occurredAt' as const, direction: 'desc' as const }];
    if (filters.sharing === 'shared' || filters.sharingPersonId?.trim()) {
      const transactions = await this.listAllPostedTransactions(input.accountId, ledgerFilters, sort);
      const sharedTransactionIds = new Set(
        this.state.expenseShares
          .filter((share) => filters.sharing !== 'shared' || share.participants.length > 0)
          .filter((share) => !filters.sharingPersonId?.trim()
            || share.participants.some((participant) => participant.personId === filters.sharingPersonId))
          .map((share) => share.transactionId),
      );
      const page = paginateWebItems(
        transactions.filter((transaction) => sharedTransactionIds.has(transaction.id)),
        input.pagination,
      );
      return {
        ...page,
        content: page.content.map((transaction) => mapPostedTransactionToSearchItem(transaction)),
      };
    }
    const { page, size } = normalizeWebPagination(input.pagination);
    const result = await this.ledger.listTransactions({
      accountId: input.accountId,
      filters: ledgerFilters,
      pagination: {
        page,
        size,
      },
      sort,
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

  private async listAllPostedTransactions(
    accountId: string,
    filters: Parameters<MovementsLedgerReader['listTransactions']>[0]['filters'],
    sort: Parameters<MovementsLedgerReader['listTransactions']>[0]['sort'],
  ) {
    const transactions = [] as Awaited<ReturnType<MovementsLedgerReader['listTransactions']>>['content'];
    let page = 0;
    let hasNext = true;
    while (hasNext) {
      const result = await this.ledger.listTransactions({ accountId, filters, pagination: { page, size: 100 }, sort });
      transactions.push(...result.content);
      hasNext = result.hasNext && result.content.length > 0;
      page += 1;
    }
    return transactions;
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
