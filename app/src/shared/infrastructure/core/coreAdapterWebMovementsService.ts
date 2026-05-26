import type {
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
  MovementsSearchInput,
  MovementsSearchResult,
} from '../../domain/corePort';
import type { WebExpectedMovementsService } from './coreAdapterWebExpectedService';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import {
  filterExpectedMovements,
  filterScheduledMovements,
  mapExpectedMovementToSearchItem,
  mapPostedTransactionToSearchItem,
  mapScheduledMovementToSearchItem,
} from './coreAdapterWebMovementQueries';
import type { WebSchedulingService } from './coreAdapterWebSchedulingService';
import type { WebCoreState } from './coreAdapterWebState';
import type { WebTaxonomyService } from './coreAdapterWebTaxonomyService';
import { getMovementsSearchFacets } from './movementsSearchFacets';

export type WebMovementsServiceOptions = {
  state: WebCoreState;
  ledger: WebLedgerService;
  taxonomy: WebTaxonomyService;
  scheduling: WebSchedulingService;
  expected: WebExpectedMovementsService;
};

export class WebMovementsService {
  private readonly state: WebCoreState;

  private readonly ledger: WebLedgerService;

  private readonly taxonomy: WebTaxonomyService;

  private readonly scheduling: WebSchedulingService;

  private readonly expected: WebExpectedMovementsService;

  constructor(options: WebMovementsServiceOptions) {
    this.state = options.state;
    this.ledger = options.ledger;
    this.taxonomy = options.taxonomy;
    this.scheduling = options.scheduling;
    this.expected = options.expected;
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

    const postedFilters = {
      fromDate,
      toDate,
      statuses: ['posted' as const],
    };
    const allPosted: LedgerTransactionListItem[] = [];
    let postedPageIndex = 0;
    let hasMorePosted = true;
    while (hasMorePosted) {
      const pageResult = await this.ledger.listTransactions({
        accountId: input.accountId,
        filters: postedFilters,
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

    const postedPage: LedgerListTransactionsResult = {
      content: allPosted,
      page: 0,
      size: allPosted.length,
      totalElements: allPosted.length,
      totalPages: allPosted.length === 0 ? 0 : 1,
      hasNext: false,
      hasPrevious: false,
    };

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

  async search(input: MovementsSearchInput): Promise<MovementsSearchResult> {
    const requestedSize = input.pagination?.size ?? 20;
    const pageSize = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;
    const requestedPage = input.pagination?.page ?? 0;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const filters = input.filters ?? {};

    if (input.source === 'posted') {
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
          size: pageSize,
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

    if (input.source === 'expected') {
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

      const totalElements = sorted.length;
      const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
      const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
      const startIndex = resolvedPage * pageSize;
      const content = sorted.slice(startIndex, startIndex + pageSize);
      return {
        content: content.map((movement) => mapExpectedMovementToSearchItem(
          movement,
          (categoryId) => this.taxonomy.categoryNameById(categoryId),
        )),
        page: resolvedPage,
        size: pageSize,
        totalElements,
        totalPages,
        hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
        hasPrevious: resolvedPage > 0,
      };
    }

    const scheduledResult = await this.listScheduled({
      accountId: input.accountId,
      filters,
      pagination: {
        page,
        size: pageSize,
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

  async getSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> {
    return getMovementsSearchFacets({
      ledgerListTransactions: (request) => this.ledger.listTransactions(request),
      orchestrationListTransactionTaxonomy: (request) => this.taxonomy.listTransactionTaxonomy(request),
      taxonomyListCategories: (request) => this.taxonomy.listCategories(request),
      taxonomyListTags: (request) => this.taxonomy.listTags(request),
      schedulingListMovements: (request) => this.scheduling.listMovements(request),
      expectedListMovements: (request) => this.expected.listMovements(request),
    }, input);
  }

  async listScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    return this.scheduling.listScheduledPage(input);
  }
}
