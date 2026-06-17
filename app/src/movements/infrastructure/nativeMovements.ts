import type { ExpectedMovementItem, ExpectedPort } from '../../expected/application/expected.port';
import type { LedgerPort, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SchedulingMovementItem, SchedulingPort } from '../../scheduling/application/scheduling.port';
import type { TaxonomyListCategoriesResult, TaxonomyPort } from '../../taxonomy/application/taxonomy.port';
import { parseDateFilterEpoch } from '../../shared/domain/dateFilterRange';
import type {
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsQueryPort,
  MovementsSearchInput,
  MovementsSearchItem,
  MovementsSearchResult,
} from '../application/movements.port';

type ScheduledMovementFilters = MovementsSearchInput['filters'] | MovementsListScheduledInput['filters'];

type NativeMovementsPort = Pick<
  LedgerPort & ExpectedPort & TaxonomyPort & MovementsQueryPort & SchedulingPort,
  | 'ledgerListTransactions'
  | 'ledgerListAccounts'
  | 'expectedListMovements'
  | 'taxonomyListCategories'
  | 'movementsListScheduled'
  | 'schedulingListMovements'
>;

function scheduledMovementDateEpoch(movement: SchedulingMovementItem): number | undefined {
  const candidate = movement.nextDueAt ?? movement.startAt;
  const parsed = candidate ? Date.parse(candidate) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterScheduledMovementItems(
  items: SchedulingMovementItem[],
  filters?: ScheduledMovementFilters,
): SchedulingMovementItem[] {
  const resolvedFilters = filters ?? {};
  const text = resolvedFilters.text?.trim().toLowerCase();
  const merchant = resolvedFilters.merchant?.trim().toLowerCase();
  const categoryIds = resolvedFilters.categoryIds && resolvedFilters.categoryIds.length > 0
    ? resolvedFilters.categoryIds
    : resolvedFilters.categoryId
      ? [resolvedFilters.categoryId]
      : [];
  const categoryFilter = categoryIds.length > 0
    ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const tagFilter = resolvedFilters.tagIds && resolvedFilters.tagIds.length > 0
    ? new Set(resolvedFilters.tagIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const typeFilter = resolvedFilters.types && resolvedFilters.types.length > 0
    ? new Set(resolvedFilters.types.filter((value) => value === 'expense' || value === 'income' || value === 'transfer'))
    : null;
  const parsedAmountMin = resolvedFilters.amountMin == null ? undefined : Number(resolvedFilters.amountMin);
  const parsedAmountMax = resolvedFilters.amountMax == null ? undefined : Number(resolvedFilters.amountMax);
  const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
  const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
  const fromDateEpoch = parseDateFilterEpoch(resolvedFilters.fromDate, 'start');
  const toDateEpoch = parseDateFilterEpoch(resolvedFilters.toDate, 'end');
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((item) => (typeFilter ? typeFilter.has(item.type) : true))
    .filter((item) => (categoryFilter ? Boolean(item.categoryId && categoryFilter.has(item.categoryId)) : true))
    .filter((item) => {
      if (!tagFilter) {
        return true;
      }
      return (item.tagIds ?? []).some((tagId) => tagFilter.has(tagId));
    })
    .filter((item) => {
      if (!hasAmountMin && !hasAmountMax) {
        return true;
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasAmountMin && amount < parsedAmountMin!) {
        return false;
      }
      if (hasAmountMax && amount > parsedAmountMax!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const dueEpoch = scheduledMovementDateEpoch(item);
      if (dueEpoch == null) {
        return false;
      }
      if (hasFromDateEpoch && dueEpoch < fromDateEpoch!) {
        return false;
      }
      if (hasToDateEpoch && dueEpoch > toDateEpoch!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!merchant) {
        return true;
      }
      return (item.merchant ?? '').toLowerCase().includes(merchant);
    })
    .filter((item) => {
      if (!text) {
        return true;
      }
      const merchantText = item.merchant?.toLowerCase() ?? '';
      const descriptionText = item.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    });
}

function mapPostedTransactionToSearchItem(transaction: LedgerTransactionListItem): MovementsSearchItem {
  return {
    id: transaction.id,
    source: 'posted',
    type: transaction.type,
    status: transaction.status === 'voided' ? 'voided' : 'posted',
    amount: transaction.amount,
    currency: transaction.currency,
    occurredAt: transaction.occurredAt,
    title: transaction.merchant || transaction.description || 'Movement',
    description: transaction.description,
    merchant: transaction.merchant,
    categoryId: transaction.categoryId,
    category: transaction.category,
    tags: transaction.tags,
    items: transaction.items,
  };
}

function mapScheduledMovementToSearchItem(movement: SchedulingMovementItem): MovementsSearchItem {
  const tags = (movement.tagNames ?? movement.tagIds ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => ({ id: tag, name: tag }));

  return {
    id: movement.id,
    source: 'scheduled',
    type: movement.type,
    status: movement.status === 'active' ? 'scheduled' : movement.status === 'deactivated' ? 'deactivated' : 'failed',
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.nextDueAt ?? movement.startAt,
    title: movement.merchant || movement.description || 'Scheduled movement',
    description: movement.description,
    merchant: movement.merchant,
    category: movement.categoryId ? { id: movement.categoryId, name: movement.categoryId } : undefined,
    tags,
    items: movement.splitItems,
  };
}

function expectedMovementDateEpoch(movement: ExpectedMovementItem): number | undefined {
  const parsed = movement.expectedAt ? Date.parse(movement.expectedAt) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function filterExpectedMovementItems(
  items: ExpectedMovementItem[],
  filters?: MovementsSearchInput['filters'],
): ExpectedMovementItem[] {
  const resolvedFilters = filters ?? {};
  const text = resolvedFilters.text?.trim().toLowerCase();
  const merchant = resolvedFilters.merchant?.trim().toLowerCase();
  const categoryIds = resolvedFilters.categoryIds && resolvedFilters.categoryIds.length > 0
    ? resolvedFilters.categoryIds
    : resolvedFilters.categoryId
      ? [resolvedFilters.categoryId]
      : [];
  const categoryFilter = categoryIds.length > 0
    ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const hasTagFilter = Boolean(resolvedFilters.tagIds && resolvedFilters.tagIds.length > 0);
  const typeFilter = resolvedFilters.types && resolvedFilters.types.length > 0
    ? new Set(resolvedFilters.types.filter((value) => value === 'expense' || value === 'income'))
    : null;
  const parsedAmountMin = resolvedFilters.amountMin == null ? undefined : Number(resolvedFilters.amountMin);
  const parsedAmountMax = resolvedFilters.amountMax == null ? undefined : Number(resolvedFilters.amountMax);
  const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
  const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);
  const fromDateEpoch = parseDateFilterEpoch(resolvedFilters.fromDate, 'start');
  const toDateEpoch = parseDateFilterEpoch(resolvedFilters.toDate, 'end');
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);

  return items
    .filter((item) => (typeFilter ? typeFilter.has(item.type) : true))
    .filter((item) => (categoryFilter ? Boolean(item.categoryId && categoryFilter.has(item.categoryId)) : true))
    .filter(() => !hasTagFilter)
    .filter((item) => {
      if (!hasAmountMin && !hasAmountMax) {
        return true;
      }
      const amount = Number(item.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasAmountMin && amount < parsedAmountMin!) {
        return false;
      }
      if (hasAmountMax && amount > parsedAmountMax!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!hasFromDateEpoch && !hasToDateEpoch) {
        return true;
      }
      const expectedEpoch = expectedMovementDateEpoch(item);
      if (expectedEpoch == null) {
        return false;
      }
      if (hasFromDateEpoch && expectedEpoch < fromDateEpoch!) {
        return false;
      }
      if (hasToDateEpoch && expectedEpoch > toDateEpoch!) {
        return false;
      }
      return true;
    })
    .filter((item) => {
      if (!merchant) {
        return true;
      }
      return (item.merchant ?? '').toLowerCase().includes(merchant);
    })
    .filter((item) => {
      if (!text) {
        return true;
      }
      const merchantText = item.merchant?.toLowerCase() ?? '';
      const descriptionText = item.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    });
}

function sortExpectedMovementItems(
  items: ExpectedMovementItem[],
  sort?: MovementsSearchInput['sort'],
): ExpectedMovementItem[] {
  const resolvedSort = sort && sort.length > 0 ? sort : [{ field: 'date' as const, direction: 'desc' as const }];
  const [primary] = resolvedSort;
  const direction = primary.direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const comparison = primary.field === 'amount'
      ? Number(left.amount) - Number(right.amount)
      : (expectedMovementDateEpoch(left) ?? 0) - (expectedMovementDateEpoch(right) ?? 0);
    if (comparison !== 0) {
      return comparison * direction;
    }
    return left.id.localeCompare(right.id);
  });
}

function mapExpectedMovementToSearchItem(
  movement: ExpectedMovementItem,
  categoryNamesById?: Map<string, string>,
): MovementsSearchItem {
  return {
    id: movement.id,
    source: 'expected',
    type: movement.type,
    status: movement.status === 'pending' ? 'expected' : movement.status,
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.expectedAt,
    title: movement.merchant || movement.description || 'Expected movement',
    description: movement.description,
    merchant: movement.merchant,
    categoryId: movement.categoryId,
    category: movement.categoryId
      ? { id: movement.categoryId, name: categoryNamesById?.get(movement.categoryId) ?? movement.categoryId }
      : undefined,
    tags: [],
    items: movement.splitItems,
  };
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

async function listPostedTransactionsForNativeAccounts(
  core: NativeMovementsPort,
  accountIds: string[],
  input: MovementsMonthOverviewInput,
  fromDate?: string,
  toDate?: string,
) {
  const pageRequest = input.postedPagination ?? input.executedPagination;
  const requestedPage = pageRequest?.page ?? 0;
  const requestedSize = pageRequest?.size ?? 100;
  const pages = await Promise.all(accountIds.map((accountId) => core.ledgerListTransactions({
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
  const sorted = uniqueById(pages.flatMap((page) => page.content))
    .sort(compareTransactions(input.sort?.[0]?.direction ?? 'desc'));
  const totalElements = sorted.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / requestedSize);
  const page = totalPages === 0 ? 0 : Math.min(Math.max(requestedPage, 0), totalPages - 1);
  const start = page * requestedSize;

  return {
    content: sorted.slice(start, start + requestedSize),
    page,
    size: requestedSize,
    totalElements,
    totalPages,
    hasNext: totalPages > 0 && page + 1 < totalPages,
    hasPrevious: page > 0,
  };
}

export async function getNativeMovementsMonthOverview(
  core: NativeMovementsPort,
  input: MovementsMonthOverviewInput,
): Promise<MovementsMonthOverviewResult> {
  const fromDate = input.fromDate ?? input.filters?.fromDate;
  const toDate = input.toDate ?? input.filters?.toDate;
  const accountIds = input.accountId
    ? [input.accountId]
    : (await core.ledgerListAccounts()).items.map((account) => account.id);
  const expectedPreviewSize = input.expectedPreviewSize != null && input.expectedPreviewSize > 0
    ? Math.min(Math.trunc(input.expectedPreviewSize), 20)
    : 5;
  const scheduledItems: SchedulingMovementItem[] = [];

  for (const accountId of accountIds) {
    let scheduledPageIndex = 0;
    let hasMoreScheduled = true;
    while (hasMoreScheduled) {
      const pageResult = await core.movementsListScheduled({
        accountId,
        filters: {
          fromDate,
          toDate,
        },
        pagination: {
          page: scheduledPageIndex,
          size: 100,
        },
      });
      scheduledItems.push(...pageResult.content);
      hasMoreScheduled = pageResult.hasNext;
      scheduledPageIndex += 1;
      if (!hasMoreScheduled || pageResult.content.length === 0) {
        break;
      }
    }
  }
  const expectedResults = await Promise.all(accountIds.map((accountId) => core.expectedListMovements({ accountId })));
  const expectedFiltered = sortExpectedMovementItems(
    filterExpectedMovementItems(uniqueById(expectedResults.flatMap((result) => result.items)), {
      fromDate,
      toDate,
    }),
    [{ field: 'date', direction: 'asc' }],
  );

  const postedPage = input.accountId
    ? await core.ledgerListTransactions({
      accountId: input.accountId,
      filters: {
        fromDate,
        toDate,
        statuses: ['posted'],
      },
      pagination: input.postedPagination ?? input.executedPagination,
      sort: input.sort ?? [{ field: 'occurredAt', direction: 'desc' }],
    })
    : await listPostedTransactionsForNativeAccounts(core, accountIds, input, fromDate, toDate);

  return {
    scheduledPreview: {
      items: uniqueById(scheduledItems),
      total: uniqueById(scheduledItems).length,
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

export async function searchNativeMovements(
  core: NativeMovementsPort,
  input: MovementsSearchInput,
): Promise<MovementsSearchResult> {
  const requestedSize = input.pagination?.size ?? 20;
  const pageSize = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;
  const requestedPage = input.pagination?.page ?? 0;
  const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
  const filters = input.filters ?? {};

  if (input.source === 'posted') {
    const result = await core.ledgerListTransactions({
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
    const [result, categories]: [Awaited<ReturnType<ExpectedPort['expectedListMovements']>>, TaxonomyListCategoriesResult] = await Promise.all([
      core.expectedListMovements({
        accountId: input.accountId,
        includeClosed: filters.status === 'all',
      }),
      core.taxonomyListCategories({}),
    ]);
    const categoryNamesById = new Map(categories.items.map((category) => [category.id, category.name]));
    const filtered = filterExpectedMovementItems(result.items, filters);
    const sorted = sortExpectedMovementItems(filtered, input.sort);
    const totalElements = sorted.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
    const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const start = resolvedPage * pageSize;
    const content = sorted
      .slice(start, start + pageSize)
      .map((movement) => mapExpectedMovementToSearchItem(movement, categoryNamesById));

    return {
      content,
      page: resolvedPage,
      size: pageSize,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    };
  }

  const scheduledResult = await core.movementsListScheduled({
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
    content: scheduledResult.content.map((movement) => mapScheduledMovementToSearchItem(movement)),
    page: scheduledResult.page,
    size: scheduledResult.size,
    totalElements: scheduledResult.totalElements,
    totalPages: scheduledResult.totalPages,
    hasNext: scheduledResult.hasNext,
    hasPrevious: scheduledResult.hasPrevious,
  };
}

export async function listNativeScheduledMovements(
  core: NativeMovementsPort,
  input: MovementsListScheduledInput,
): Promise<MovementsListScheduledResult> {
  const result = await core.schedulingListMovements({ sourceAccountId: input.accountId });
  const requestedPage = input.pagination?.page ?? 0;
  const requestedSize = input.pagination?.size ?? 20;
  const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
  const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

  const filtered = filterScheduledMovementItems(result.items, input.filters);

  const totalElements = filtered.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const start = resolvedPage * size;
  const content = filtered.slice(start, start + size);

  return {
    content,
    page: resolvedPage,
    size,
    totalElements,
    totalPages,
    hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
    hasPrevious: resolvedPage > 0,
  };
}
