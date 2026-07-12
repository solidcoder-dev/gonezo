import { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsFilterFacetAccount,
  AnalyticsFilterFacetTag,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
} from './analytics.port';
import {
  DEFAULT_ANALYTICS_FILTERS,
  analyticsReferenceDateFromNow,
  mergeAnalyticsFilters,
  type AnalyticsFilters,
  type AnalyticsFiltersInput,
  type AnalyticsLocalDate,
  type AnalyticsPeriod,
  type AnalyticsSharedAmountMode,
  type AnalyticsViewMode,
} from './analyticsFilters';
import { resolveAnalyticsPeriodWindow } from './analyticsPeriodResolver';

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

export type AnalyticsFiltersModel = {
  filters: AnalyticsFilters;
  viewMode: AnalyticsViewMode;
  currencies: string[];
  availableAccounts: AnalyticsFilterFacetAccount[];
  availableTags: AnalyticsFilterFacetTag[];
  selectedTags: AnalyticsFilterFacetTag[];
  loading: boolean;
  disabled: boolean;
  currencySheetOpen: boolean;
  draftCurrency: string;
  periodSheetOpen: boolean;
  draftPeriod: AnalyticsPeriod;
  draftCustomFrom: AnalyticsLocalDate;
  draftCustomTo: AnalyticsLocalDate;
  draftPeriodError?: string;
  tagSheetOpen: boolean;
  draftTagIds: string[];
  moreFiltersSheetOpen: boolean;
  draftAccountIds: string[];
  draftIncludeIgnoredMovements: boolean;
  draftSharedAmountMode: AnalyticsSharedAmountMode;
  commands: {
    selectViewMode: (viewMode: AnalyticsViewMode) => void;
    openCurrencySheet: () => void;
    closeCurrencySheet: () => void;
    setDraftCurrency: (currency: string) => void;
    applyDraftCurrency: () => void;
    openPeriodSheet: () => void;
    closePeriodSheet: () => void;
    setDraftPeriod: (period: AnalyticsPeriod) => void;
    setDraftCustomFrom: (from: AnalyticsLocalDate) => void;
    setDraftCustomTo: (to: AnalyticsLocalDate) => void;
    applyDraftPeriod: () => void;
    openTagSheet: () => void;
    closeTagSheet: () => void;
    toggleDraftTagId: (tagId: string) => void;
    resetDraftTagIds: () => void;
    applyDraftTagIds: () => void;
    openMoreFiltersSheet: () => void;
    closeMoreFiltersSheet: () => void;
    setDraftAccountIds: (accountIds: string[]) => void;
    setDraftIncludeIgnoredMovements: (includeIgnoredMovements: boolean) => void;
    setDraftSharedAmountMode: (sharedAmountMode: AnalyticsSharedAmountMode) => void;
    resetMoreFiltersDraft: () => void;
    applyMoreFiltersDraft: () => void;
  };
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

function filterAccountsByCurrency(accounts: AnalyticsFilterFacetAccount[], currency: string): AnalyticsFilterFacetAccount[] {
  if (!currency) {
    return accounts;
  }
  return accounts.filter((account) => account.currency.toUpperCase() === currency);
}

function toggleIdentifier(values: string[], candidate: string): string[] {
  return values.includes(candidate)
    ? values.filter((value) => value !== candidate)
    : [...values, candidate];
}

function currentCustomRange(period: AnalyticsPeriod): { from: AnalyticsLocalDate; to: AnalyticsLocalDate } {
  if (period.kind === 'custom') {
    return { from: period.from, to: period.to };
  }
  const referenceDate = analyticsReferenceDateFromNow();
  const range = resolveAnalyticsPeriodWindow(period, referenceDate).currentRange;
  return range ?? { from: referenceDate, to: referenceDate };
}

function periodValidationError(period: AnalyticsPeriod): string | undefined {
  if (period.kind === 'custom' && period.from > period.to) {
    return 'Choose a valid date range.';
  }
  return undefined;
}

function appliedPeriod(period: AnalyticsPeriod, draftCustomFrom: AnalyticsLocalDate, draftCustomTo: AnalyticsLocalDate): AnalyticsPeriod {
  const referenceDate = analyticsReferenceDateFromNow();
  if (period.kind === 'custom') {
    return { kind: 'custom', from: draftCustomFrom, to: draftCustomTo };
  }
  if (period.kind === 'rollingDays') {
    return { kind: 'rollingDays', days: 30, anchorDate: referenceDate };
  }
  if (period.kind === 'rollingMonths') {
    return { kind: 'rollingMonths', months: 3, anchorDate: referenceDate };
  }
  return period;
}

export function useAnalyticsFiltersModel(input: AnalyticsFiltersModelInput): AnalyticsFiltersModel {
  const { core, enabled, onError, refreshSignal } = input;
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('overview');
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [facets, setFacets] = useState<{ accounts: AnalyticsFilterFacetAccount[]; tags: AnalyticsFilterFacetTag[] }>({
    accounts: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);

  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [draftCurrency, setDraftCurrency] = useState(DEFAULT_ANALYTICS_FILTERS.currency);

  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_FILTERS.period);
  const initialCustomRange = currentCustomRange(DEFAULT_ANALYTICS_FILTERS.period);
  const [draftCustomFrom, setDraftCustomFrom] = useState(initialCustomRange.from);
  const [draftCustomTo, setDraftCustomTo] = useState(initialCustomRange.to);

  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [draftTagIds, setDraftTagIds] = useState<string[]>([]);

  const [moreFiltersSheetOpen, setMoreFiltersSheetOpen] = useState(false);
  const [draftAccountIds, setDraftAccountIds] = useState<string[]>([]);
  const [draftIncludeIgnoredMovements, setDraftIncludeIgnoredMovements] = useState(false);
  const [draftSharedAmountMode, setDraftSharedAmountMode] = useState<AnalyticsSharedAmountMode>('personal');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadCurrencies() {
      setLoading(true);
      try {
        const result = await core.analyticsListCurrencies();
        if (cancelled) {
          return;
        }

        setCurrencies(result.items);
        setFilters((current) => {
          const nextCurrency = resolveInitialCurrency(result.items, current.currency);
          return mergeAnalyticsFilters(current, {
            currency: nextCurrency,
            accountIds: nextCurrency === current.currency ? current.accountIds : [],
          });
        });
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
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
  }, [core, enabled, onError, refreshSignal]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    async function loadFacets() {
      try {
        const result = await core.analyticsGetFilterFacets({ filters });
        if (!cancelled) {
          setFacets(result);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
        }
      }
    }

    void loadFacets();

    return () => {
      cancelled = true;
    };
  }, [core, enabled, filters, onError, refreshSignal]);

  const availableAccounts = useMemo(
    () => filterAccountsByCurrency(facets.accounts, filters.currency),
    [facets.accounts, filters.currency],
  );
  const availableTags = useMemo(() => facets.tags, [facets.tags]);
  const selectedTagItems = useMemo(() => selectedTags(filters, facets.tags), [facets.tags, filters]);
  const draftPeriodCandidate = draftPeriod.kind === 'custom'
    ? { kind: 'custom', from: draftCustomFrom, to: draftCustomTo } satisfies AnalyticsPeriod
    : draftPeriod;

  function applyFilters(patch: AnalyticsFiltersInput) {
    setFilters((current) => mergeAnalyticsFilters(current, patch));
  }

  return {
    filters,
    viewMode,
    currencies,
    availableAccounts,
    availableTags,
    selectedTags: selectedTagItems,
    loading,
    disabled: !enabled,
    currencySheetOpen,
    draftCurrency,
    periodSheetOpen,
    draftPeriod,
    draftCustomFrom,
    draftCustomTo,
    draftPeriodError: periodValidationError(draftPeriodCandidate),
    tagSheetOpen,
    draftTagIds,
    moreFiltersSheetOpen,
    draftAccountIds,
    draftIncludeIgnoredMovements,
    draftSharedAmountMode,
    commands: {
      selectViewMode: setViewMode,
      openCurrencySheet: () => {
        setDraftCurrency(filters.currency);
        setCurrencySheetOpen(true);
      },
      closeCurrencySheet: () => setCurrencySheetOpen(false),
      setDraftCurrency,
      applyDraftCurrency: () => {
        applyFilters({
          currency: draftCurrency,
          accountIds: [],
        });
        setCurrencySheetOpen(false);
      },
      openPeriodSheet: () => {
        setDraftPeriod(filters.period);
        const customRange = currentCustomRange(filters.period);
        setDraftCustomFrom(customRange.from);
        setDraftCustomTo(customRange.to);
        setPeriodSheetOpen(true);
      },
      closePeriodSheet: () => setPeriodSheetOpen(false),
      setDraftPeriod: (period) => {
        setDraftPeriod(period);
        if (period.kind === 'custom') {
          const customRange = currentCustomRange(period);
          setDraftCustomFrom(customRange.from);
          setDraftCustomTo(customRange.to);
        }
      },
      setDraftCustomFrom,
      setDraftCustomTo,
      applyDraftPeriod: () => {
        const nextPeriod = appliedPeriod(draftPeriod, draftCustomFrom, draftCustomTo);
        if (periodValidationError(nextPeriod)) {
          return;
        }
        applyFilters({ period: nextPeriod });
        setPeriodSheetOpen(false);
      },
      openTagSheet: () => {
        setDraftTagIds(filters.tagIds);
        setTagSheetOpen(true);
      },
      closeTagSheet: () => setTagSheetOpen(false),
      toggleDraftTagId: (tagId: string) => {
        setDraftTagIds((current) => toggleIdentifier(current, tagId));
      },
      resetDraftTagIds: () => setDraftTagIds([]),
      applyDraftTagIds: () => {
        applyFilters({ tagIds: draftTagIds });
        setTagSheetOpen(false);
      },
      openMoreFiltersSheet: () => {
        setDraftAccountIds(filters.accountIds);
        setDraftIncludeIgnoredMovements(filters.includeIgnoredMovements);
        setDraftSharedAmountMode(filters.sharedAmountMode);
        setMoreFiltersSheetOpen(true);
      },
      closeMoreFiltersSheet: () => setMoreFiltersSheetOpen(false),
      setDraftAccountIds,
      setDraftIncludeIgnoredMovements,
      setDraftSharedAmountMode,
      resetMoreFiltersDraft: () => {
        setDraftAccountIds([]);
        setDraftIncludeIgnoredMovements(false);
        setDraftSharedAmountMode('personal');
      },
      applyMoreFiltersDraft: () => {
        applyFilters({
          accountIds: draftAccountIds,
          includeIgnoredMovements: draftIncludeIgnoredMovements,
          sharedAmountMode: draftSharedAmountMode,
        });
        setMoreFiltersSheetOpen(false);
      },
    },
  };
}
