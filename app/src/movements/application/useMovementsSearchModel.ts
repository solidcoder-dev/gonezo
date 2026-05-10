import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LedgerAccountItem,
  MovementsSearchInput,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
} from '../../shared/domain/corePort';
import type {
  MovementsPaginationView,
  MovementsSearchFiltersState,
  MovementsSearchItemView,
  MovementsSearchModelProvided,
  MovementsSearchModelRequired,
} from '../domain/movementsView.types';
import {
  buildPostedTaxonomySearchPage,
  collectPostedTaxonomySearchItems,
  hasPostedTaxonomyFilters,
  hydratePostedSearchItems,
  type PostedTaxonomySearchPort,
} from './postedTaxonomySearch';

type SearchAccount = Pick<LedgerAccountItem, 'id' | 'name'>;

type UseMovementsSearchModelInput = {
  core: PostedTaxonomySearchPort;
  accounts: SearchAccount[];
  accountId: string | null;
  enabled: boolean;
};

const SEARCH_COLLECTION_PAGE_SIZE = 100;

const DEFAULT_FILTERS: MovementsSearchFiltersState = {
  source: 'posted',
  text: '',
  merchant: '',
  categoryIds: [],
  tagIds: [],
  amountMin: '',
  amountMax: '',
  fromDate: '',
  toDate: '',
  types: [],
  sortField: 'date',
  sortDirection: 'desc',
  pageSize: 10,
  groupByDay: true,
};

const EMPTY_PAGINATION: MovementsPaginationView = {
  page: 0,
  size: DEFAULT_FILTERS.pageSize,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const EMPTY_ITEMS: MovementsSearchItemView[] = [];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function normalizeIdentifierList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeAmount(value: string): string | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric.toString();
}

function normalizeDate(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

function buildSearchFilters(filters: MovementsSearchFiltersState): MovementsSearchInput['filters'] {
  const normalizedCategoryIds = normalizeIdentifierList(filters.categoryIds);
  const normalizedTagIds = normalizeIdentifierList(filters.tagIds);
  let amountMin = normalizeAmount(filters.amountMin);
  let amountMax = normalizeAmount(filters.amountMax);
  if (amountMin != null && amountMax != null && Number(amountMin) > Number(amountMax)) {
    [amountMin, amountMax] = [amountMax, amountMin];
  }

  return {
    text: filters.text.trim() || undefined,
    merchant: filters.merchant.trim() || undefined,
    categoryIds: normalizedCategoryIds.length > 0 ? normalizedCategoryIds : undefined,
    categoryId: normalizedCategoryIds.length === 1 ? normalizedCategoryIds[0] : undefined,
    tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
    amountMin,
    amountMax,
    fromDate: normalizeDate(filters.fromDate),
    toDate: normalizeDate(filters.toDate),
    types: filters.types.length > 0 ? filters.types : undefined,
  };
}

function getAccountScope(accounts: SearchAccount[], accountId: string | null): SearchAccount[] {
  if (!accountId) {
    return accounts;
  }
  return accounts.filter((account) => account.id === accountId);
}

function withAccountContext(
  item: MovementsSearchItemView,
  account: SearchAccount,
): MovementsSearchItemView {
  return {
    ...item,
    accountId: account.id,
    accountName: account.name,
  };
}

function compareDates(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }
  return left.localeCompare(right);
}

function compareAmounts(left: string, right: string): number {
  const leftAmount = Number(left);
  const rightAmount = Number(right);
  if (Number.isFinite(leftAmount) && Number.isFinite(rightAmount)) {
    return leftAmount - rightAmount;
  }
  return left.localeCompare(right);
}

function compareSearchItems(
  left: MovementsSearchItemView,
  right: MovementsSearchItemView,
  filters: MovementsSearchFiltersState,
): number {
  const direction = filters.sortDirection === 'asc' ? 1 : -1;
  const primary = filters.sortField === 'amount'
    ? compareAmounts(left.amount, right.amount)
    : compareDates(left.occurredAt, right.occurredAt);
  if (primary !== 0) {
    return primary * direction;
  }

  const fallbackDate = compareDates(left.occurredAt, right.occurredAt);
  if (fallbackDate !== 0) {
    return fallbackDate * -1;
  }

  return `${left.accountId ?? ''}:${left.source}:${left.id}`.localeCompare(`${right.accountId ?? ''}:${right.source}:${right.id}`);
}

function uniqueSearchItems(items: MovementsSearchItemView[]): MovementsSearchItemView[] {
  const seen = new Set<string>();
  const unique: MovementsSearchItemView[] = [];
  for (const item of items) {
    const key = `${item.accountId ?? ''}:${item.source}:${item.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function paginateSearchItems(
  items: MovementsSearchItemView[],
  filters: MovementsSearchFiltersState,
  requestedPage: number,
): { items: MovementsSearchItemView[]; pagination: MovementsPaginationView } {
  const pageSize = filters.pageSize;
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(requestedPage, totalPages - 1);
  const start = resolvedPage * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page: resolvedPage,
      size: pageSize,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    },
  };
}

function mergeFilterPatch(
  base: MovementsSearchFiltersState,
  patch: Partial<MovementsSearchFiltersState>,
): MovementsSearchFiltersState {
  const next: MovementsSearchFiltersState = {
    ...base,
    ...patch,
  };
  if (patch.categoryIds != null) {
    next.categoryIds = normalizeIdentifierList(patch.categoryIds);
  }
  if (patch.tagIds != null) {
    next.tagIds = normalizeIdentifierList(patch.tagIds);
  }
  if (patch.pageSize != null) {
    const parsedPageSize = Number(patch.pageSize);
    next.pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(Math.trunc(parsedPageSize), 100)
      : DEFAULT_FILTERS.pageSize;
  }
  if (patch.types != null) {
    next.types = [...new Set(patch.types)];
  }
  return next;
}

export function useMovementsSearchModel(input: UseMovementsSearchModelInput) {
  const { core, accounts, accountId, enabled } = input;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersAdvancedOpen, setFiltersAdvancedOpen] = useState(false);
  const [searchApplied, setSearchApplied] = useState(false);
  const [filterDraft, setFilterDraft] = useState<MovementsSearchFiltersState>(() => ({ ...DEFAULT_FILTERS }));
  const [appliedFilters, setAppliedFilters] = useState<MovementsSearchFiltersState>(() => ({ ...DEFAULT_FILTERS }));
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState<MovementsPaginationView>(EMPTY_PAGINATION);
  const [items, setItems] = useState<MovementsSearchItemView[]>([]);
  const previousAccountScopeRef = useRef('');

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.name })),
    [categories],
  );
  const tagOptions = useMemo(
    () => tags.map((tag) => ({ id: tag.id, label: tag.name })),
    [tags],
  );
  const accountScope = useMemo(
    () => getAccountScope(accounts, accountId),
    [accounts, accountId],
  );
  const accountScopeKey = useMemo(() => {
    if (accountId) {
      return `account:${accountId}`;
    }
    return `all:${accountScope.map((account) => `${account.id}:${account.name}`).join('|')}`;
  }, [accountId, accountScope]);

  function reportError(raw: unknown) {
    setError(toErrorMessage(raw));
  }

  async function loadFilterOptions(): Promise<{ categories: TaxonomyCategoryItem[]; tags: TaxonomyTagItem[] }> {
    const operations: Promise<void>[] = [];
    let loadedCategories = categories;
    let loadedTags = tags;

    if (categories.length === 0) {
      operations.push(
        core
          .taxonomyListCategories({ includeArchived: false })
          .then((result) => {
            loadedCategories = result.items;
            setCategories(result.items);
          }),
      );
    }

    if (tags.length === 0) {
      operations.push(
        core
          .taxonomyListTags({ includeArchived: false })
          .then((result) => {
            loadedTags = result.items;
            setTags(result.items);
          }),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    return {
      categories: loadedCategories,
      tags: loadedTags,
    };
  }

  async function ensureFilterOptionsLoaded() {
    await loadFilterOptions();
  }

  async function collectSearchItemsForAccount(account: SearchAccount): Promise<MovementsSearchItemView[]> {
    const collected: MovementsSearchItemView[] = [];
    let candidatePage = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await core.movementsSearch({
        accountId: account.id,
        source: appliedFilters.source,
        filters: buildSearchFilters(appliedFilters),
        pagination: {
          page: candidatePage,
          size: SEARCH_COLLECTION_PAGE_SIZE,
        },
        sort: [
          {
            field: appliedFilters.sortField,
            direction: appliedFilters.sortDirection,
          },
        ],
      });
      collected.push(...result.content.map((item) => withAccountContext(item, account)));
      hasMore = result.hasNext && result.content.length > 0;
      candidatePage += 1;
    }

    return collected;
  }

  async function collectPostedTaxonomyItemsForAccount(account: SearchAccount): Promise<MovementsSearchItemView[]> {
    const result = await collectPostedTaxonomySearchItems({
      core,
      accountId: account.id,
      filters: appliedFilters,
    });
    return result.map((item) => withAccountContext(item, account));
  }

  function applyAggregatedResults(collected: MovementsSearchItemView[]) {
    const sortedItems = uniqueSearchItems(collected).sort((left, right) => (
      compareSearchItems(left, right, appliedFilters)
    ));
    const result = paginateSearchItems(sortedItems, appliedFilters, page);
    setItems(result.items);
    setPagination(result.pagination);
    if (page !== result.pagination.page) {
      setPage(result.pagination.page);
    }
  }

  async function refreshResults() {
    if (accountScope.length === 0) {
      setItems(EMPTY_ITEMS);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    const selectedAccount = accountId ? accountScope[0] : undefined;

    if (selectedAccount) {
      if (hasPostedTaxonomyFilters(appliedFilters)) {
        const result = await buildPostedTaxonomySearchPage({
          core,
          accountId: selectedAccount.id,
          filters: appliedFilters,
          page,
        });
        setItems(result.items.map((item) => withAccountContext(item, selectedAccount)));
        setPagination(result.pagination);
        if (page !== result.pagination.page) {
          setPage(result.pagination.page);
        }
        return;
      }

      const result = await core.movementsSearch({
        accountId: selectedAccount.id,
        source: appliedFilters.source,
        filters: buildSearchFilters(appliedFilters),
        pagination: {
          page,
          size: appliedFilters.pageSize,
        },
        sort: [
          {
            field: appliedFilters.sortField,
            direction: appliedFilters.sortDirection,
          },
        ],
      });

      const hydratedContent = appliedFilters.source === 'posted'
        ? await hydratePostedSearchItems(core, result.content)
        : result.content;
      setItems(hydratedContent.map((item) => withAccountContext(item, selectedAccount)));
      setPagination({
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      });
      if (page !== result.page) {
        setPage(result.page);
      }
      return;
    }

    if (hasPostedTaxonomyFilters(appliedFilters)) {
      const collected = (await Promise.all(
        accountScope.map((account) => collectPostedTaxonomyItemsForAccount(account)),
      )).flat();
      applyAggregatedResults(collected);
      return;
    }

    const collected = (await Promise.all(
      accountScope.map((account) => collectSearchItemsForAccount(account)),
    )).flat();
    const hydratedItems = appliedFilters.source === 'posted'
      ? await hydratePostedSearchItems(core, collected)
      : collected;
    applyAggregatedResults(hydratedItems);
  }

  useEffect(() => {
    if (!enabled || accountScope.length === 0) {
      previousAccountScopeRef.current = accountScopeKey;
      setLoading(false);
      setError('');
      setItems(EMPTY_ITEMS);
      setPagination(EMPTY_PAGINATION);
      setFiltersOpen(false);
      setFiltersAdvancedOpen(false);
      setSearchApplied(false);
      setFilterDraft(DEFAULT_FILTERS);
      setAppliedFilters(DEFAULT_FILTERS);
      setPage(0);
      return;
    }

    const accountChanged = previousAccountScopeRef.current !== accountScopeKey;
    if (accountChanged) {
      previousAccountScopeRef.current = accountScopeKey;
      setError('');
      setFiltersOpen(false);
      setFiltersAdvancedOpen(false);
      setSearchApplied(false);
      setFilterDraft({ ...DEFAULT_FILTERS });
      setAppliedFilters({ ...DEFAULT_FILTERS });
      setPage(0);
      setPagination(EMPTY_PAGINATION);
      setItems([]);
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await Promise.all([refreshResults(), ensureFilterOptionsLoaded()]);
      } catch (err) {
        if (!cancelled) {
          reportError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accountScopeKey, page, appliedFilters]);

  useEffect(() => {
    void ensureFilterOptionsLoaded().catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core]);

  const required: MovementsSearchModelRequired = {
    error,
    state: {
      source: filterDraft.source,
      items,
      filtersOpen,
      filtersAdvancedOpen,
      searchApplied,
      filters: filterDraft,
      appliedFilters,
      filterOptions: {
        categories: categoryOptions,
        tags: tagOptions,
      },
      pagination,
    },
    status: {
      loading,
      disabled: loading,
    },
  };

  const provided: MovementsSearchModelProvided = {
    commands: {
      setSource: (value) => {
        setFilterDraft((previous) => ({ ...previous, source: value }));
        setAppliedFilters((previous) => ({ ...previous, source: value }));
        setSearchApplied(true);
        setPage(0);
      },
      openFilters: () => {
        setFiltersOpen(true);
        setFiltersAdvancedOpen(false);
        void ensureFilterOptionsLoaded().catch(reportError);
      },
      closeFilters: () => {
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      toggleAdvancedFilters: () => {
        setFiltersAdvancedOpen((previous) => {
          const next = !previous;
          if (next) {
            void ensureFilterOptionsLoaded().catch(reportError);
          }
          return next;
        });
      },
      resetFilters: () => {
        setFilterDraft({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setSearchApplied(false);
        setPage(0);
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      setFilterText: (value) => setFilterDraft((previous) => ({ ...previous, text: value })),
      setFilterMerchant: (value) => setFilterDraft((previous) => ({ ...previous, merchant: value })),
      setFilterCategoryIds: (values) => setFilterDraft((previous) => ({ ...previous, categoryIds: normalizeIdentifierList(values) })),
      setFilterTagIds: (values) => setFilterDraft((previous) => ({ ...previous, tagIds: normalizeIdentifierList(values) })),
      setFilterAmountMin: (value) => setFilterDraft((previous) => ({ ...previous, amountMin: value })),
      setFilterAmountMax: (value) => setFilterDraft((previous) => ({ ...previous, amountMax: value })),
      setFilterFromDate: (value) => setFilterDraft((previous) => ({ ...previous, fromDate: value })),
      setFilterToDate: (value) => setFilterDraft((previous) => ({ ...previous, toDate: value })),
      setFilterTypes: (values) => setFilterDraft((previous) => ({ ...previous, types: [...new Set(values)] })),
      setSortField: (value) => setFilterDraft((previous) => ({
        ...previous,
        sortField: value,
        groupByDay: value === 'date' ? previous.groupByDay : false,
      })),
      setSortDirection: (value) => setFilterDraft((previous) => ({ ...previous, sortDirection: value })),
      setPageSize: (value) => {
        const normalized = Number.isFinite(value) && value > 0 ? Math.min(Math.trunc(value), 100) : DEFAULT_FILTERS.pageSize;
        setFilterDraft((previous) => ({ ...previous, pageSize: normalized }));
      },
      setGroupByDay: (value) => setFilterDraft((previous) => ({ ...previous, groupByDay: value })),
      applyFilterPatch: (patch) => {
        const nextFilters = mergeFilterPatch(appliedFilters, patch);
        setFilterDraft(nextFilters);
        setAppliedFilters(nextFilters);
        setSearchApplied(true);
        setPage(0);
      },
      applyFilters: () => {
        setAppliedFilters(mergeFilterPatch(filterDraft, {}));
        setSearchApplied(true);
        setPage(0);
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      goToPreviousPage: () => {
        setPage((previous) => Math.max(0, previous - 1));
      },
      goToNextPage: () => {
        setPage((previous) => Math.max(0, previous + 1));
      },
    },
  };

  return {
    error,
    required,
    provided,
  };
}
