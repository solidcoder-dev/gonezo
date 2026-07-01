import { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsFilterFacetAccount,
  AnalyticsFilterFacetTag,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
} from './analytics.port';
import {
  DEFAULT_ANALYTICS_FILTERS,
  mergeAnalyticsFilters,
  normalizeAnalyticsFilters,
  type AnalyticsFilters,
  type AnalyticsFiltersInput,
  type AnalyticsPeriodPreset,
  type AnalyticsViewMode,
} from './analyticsFilters';

export type AnalyticsFiltersModelPort = {
  analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult>;
  analyticsGetFilterFacets(input?: { filters?: AnalyticsFiltersInput }): Promise<AnalyticsGetFilterFacetsResult>;
};

export type AnalyticsFiltersModelInput = {
  core: AnalyticsFiltersModelPort;
  enabled: boolean;
  refreshSignal: boolean;
  onError?: (error: { message: string }) => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function resolveInitialCurrency(currencies: string[], currentCurrency: string): string {
  if (currentCurrency && currencies.includes(currentCurrency)) {
    return currentCurrency;
  }
  return currencies[0] ?? '';
}

function selectedTags(filters: AnalyticsFilters, tags: AnalyticsFilterFacetTag[]): AnalyticsFilterFacetTag[] {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  return filters.tagIds.map((tagId) => tagsById.get(tagId) ?? { id: tagId, name: tagId });
}

export function useAnalyticsFiltersModel(input: AnalyticsFiltersModelInput) {
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('overview');
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [facets, setFacets] = useState<{ accounts: AnalyticsFilterFacetAccount[]; tags: AnalyticsFilterFacetTag[] }>({
    accounts: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [draftTagIds, setDraftTagIds] = useState<string[]>([]);
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);

  useEffect(() => {
    if (!input.enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadCurrencies() {
      setLoading(true);
      try {
        const result = await input.core.analyticsListCurrencies();
        if (cancelled) {
          return;
        }
        setCurrencies(result.items);
        setFilters((current) => mergeAnalyticsFilters(current, {
          currency: resolveInitialCurrency(result.items, current.currency),
        }));
      } catch (error) {
        if (!cancelled) {
          input.onError?.({ message: toErrorMessage(error) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCurrencies();

    return () => {
      cancelled = true;
    };
  }, [input.core, input.enabled, input.refreshSignal]);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }

    let cancelled = false;
    async function loadFacets() {
      try {
        const result = await input.core.analyticsGetFilterFacets({ filters });
        if (!cancelled) {
          setFacets(result);
        }
      } catch (error) {
        if (!cancelled) {
          input.onError?.({ message: toErrorMessage(error) });
        }
      }
    }

    void loadFacets();

    return () => {
      cancelled = true;
    };
  }, [filters, input.core, input.enabled, input.refreshSignal]);

  const selectedTagItems = useMemo(() => selectedTags(filters, facets.tags), [facets.tags, filters]);
  const filteredTagOptions = useMemo(() => {
    const query = tagQuery.trim().toLowerCase();
    if (!query) {
      return facets.tags;
    }
    return facets.tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [facets.tags, tagQuery]);

  function updateFilters(patch: AnalyticsFiltersInput) {
    setFilters((current) => mergeAnalyticsFilters(current, patch));
  }

  function toggleDraftTag(tagId: string) {
    setDraftTagIds((current) => (
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId]
    ));
  }

  function openTagSheet() {
    setDraftTagIds(filters.tagIds);
    setTagQuery('');
    setTagSheetOpen(true);
  }

  function openMoreFilters() {
    setDraftFilters(filters);
    setMoreFiltersOpen(true);
  }

  return {
    filters,
    viewMode,
    required: {
      data: {
        currencies,
        accounts: facets.accounts,
        tags: filteredTagOptions,
        selectedTags: selectedTagItems,
      },
      state: {
        filters,
        draftFilters,
        draftTagIds,
        tagQuery,
        currencySheetOpen,
        periodSheetOpen,
        tagSheetOpen,
        moreFiltersOpen,
        viewMode,
      },
      status: {
        loading,
        disabled: !input.enabled,
      },
    },
    provided: {
      commands: {
        openCurrencySheet: () => setCurrencySheetOpen(true),
        closeCurrencySheet: () => setCurrencySheetOpen(false),
        selectCurrency: (currency: string) => {
          updateFilters({ currency });
          setCurrencySheetOpen(false);
        },
        openPeriodSheet: () => setPeriodSheetOpen(true),
        closePeriodSheet: () => setPeriodSheetOpen(false),
        selectPeriod: (period: AnalyticsPeriodPreset) => {
          updateFilters({ period });
          setPeriodSheetOpen(false);
        },
        selectViewMode: setViewMode,
        removeTag: (tagId: string) => updateFilters({ tagIds: filters.tagIds.filter((item) => item !== tagId) }),
        openTagSheet,
        closeTagSheet: () => setTagSheetOpen(false),
        setTagQuery,
        toggleDraftTag,
        clearDraftTags: () => setDraftTagIds([]),
        applyDraftTags: () => {
          updateFilters({ tagIds: draftTagIds });
          setTagSheetOpen(false);
        },
        openMoreFilters,
        closeMoreFilters: () => setMoreFiltersOpen(false),
        patchDraftFilters: (patch: AnalyticsFiltersInput) => {
          setDraftFilters((current) => mergeAnalyticsFilters(current, patch));
        },
        resetDraftFilters: () => {
          const currency = filters.currency || currencies[0] || '';
          setDraftFilters(normalizeAnalyticsFilters({ ...DEFAULT_ANALYTICS_FILTERS, currency }));
        },
        applyDraftFilters: () => {
          setFilters(draftFilters);
          setMoreFiltersOpen(false);
        },
      },
    },
  };
}
