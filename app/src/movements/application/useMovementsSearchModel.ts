import { useEffect, useMemo, useRef, useState } from 'react';
import type {
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
  hasPostedTaxonomyFilters,
  hydratePostedSearchItems,
  type PostedTaxonomySearchPort,
} from './postedTaxonomySearch';

type UseMovementsSearchModelInput = {
  core: PostedTaxonomySearchPort;
  accountId: string | null;
  enabled: boolean;
};

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
  const { core, accountId, enabled } = input;
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
  const previousAccountIdRef = useRef<string | null>(null);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.name })),
    [categories],
  );
  const tagOptions = useMemo(
    () => tags.map((tag) => ({ id: tag.id, label: tag.name })),
    [tags],
  );

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

  async function refreshResults() {
    if (!accountId) {
      setItems(EMPTY_ITEMS);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    if (hasPostedTaxonomyFilters(appliedFilters)) {
      const result = await buildPostedTaxonomySearchPage({
        core,
        accountId,
        filters: appliedFilters,
        page,
      });
      setItems(result.items);
      setPagination(result.pagination);
      if (page !== result.pagination.page) {
        setPage(result.pagination.page);
      }
      return;
    }

    const normalizedCategoryIds = normalizeIdentifierList(appliedFilters.categoryIds);
    const normalizedTagIds = normalizeIdentifierList(appliedFilters.tagIds);
    let amountMin = normalizeAmount(appliedFilters.amountMin);
    let amountMax = normalizeAmount(appliedFilters.amountMax);
    if (amountMin != null && amountMax != null && Number(amountMin) > Number(amountMax)) {
      [amountMin, amountMax] = [amountMax, amountMin];
    }

    const result = await core.movementsSearch({
      accountId,
      source: appliedFilters.source,
      filters: {
        text: appliedFilters.text.trim() || undefined,
        merchant: appliedFilters.merchant.trim() || undefined,
        categoryIds: normalizedCategoryIds.length > 0 ? normalizedCategoryIds : undefined,
        categoryId: normalizedCategoryIds.length === 1 ? normalizedCategoryIds[0] : undefined,
        tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
        amountMin,
        amountMax,
        fromDate: normalizeDate(appliedFilters.fromDate),
        toDate: normalizeDate(appliedFilters.toDate),
        types: appliedFilters.types.length > 0 ? appliedFilters.types : undefined,
      },
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
    setItems(hydratedContent);
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
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      previousAccountIdRef.current = accountId;
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

    const accountChanged = previousAccountIdRef.current !== accountId;
    if (accountChanged) {
      previousAccountIdRef.current = accountId;
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
  }, [enabled, accountId, page, appliedFilters]);

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
