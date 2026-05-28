import { useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledgerCore.port';
import type {
  MovementsPaginationView,
  MovementsSearchItemView,
  MovementsSearchModelProvided,
  MovementsSearchModelRequired,
} from './movementsView.types';
import { type MovementsSearchFacetsPort } from './movementsSearch.port';
import { type PostedTaxonomySearchPort } from './postedTaxonomySearch';
import { runMovementsSearchQuery } from './movementsSearchQueryRunner';
import {
  EMPTY_MOVEMENTS_SEARCH_ITEMS,
  EMPTY_MOVEMENTS_SEARCH_PAGINATION,
  getMovementsSearchAccountScope,
  getMovementsSearchAccountScopeKey,
} from './movementsSearchResults';
import { useMovementsSearchFacetsModel } from './useMovementsSearchFacetsModel';
import { useMovementsSearchFiltersModel } from './useMovementsSearchFiltersModel';

type SearchAccount = Pick<LedgerAccountItem, 'id' | 'name'>;

type UseMovementsSearchModelInput = {
  core: PostedTaxonomySearchPort & MovementsSearchFacetsPort;
  accounts: SearchAccount[];
  accountId: string | null;
  enabled: boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useMovementsSearchModel(input: UseMovementsSearchModelInput) {
  const { core, accounts, accountId, enabled } = input;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [accountScopeVersion, setAccountScopeVersion] = useState(0);
  const [pagination, setPagination] = useState<MovementsPaginationView>(EMPTY_MOVEMENTS_SEARCH_PAGINATION);
  const [items, setItems] = useState<MovementsSearchItemView[]>([]);
  const previousAccountScopeRef = useRef('');

  const accountScope = useMemo(
    () => getMovementsSearchAccountScope(accounts, accountId),
    [accounts, accountId],
  );
  const accountScopeKey = useMemo(
    () => getMovementsSearchAccountScopeKey(accountScope, accountId),
    [accountId, accountScope],
  );

  const filtersModel = useMovementsSearchFiltersModel({
    resetPage: () => setPage(0),
  });
  const facetsModel = useMovementsSearchFacetsModel({
    core,
    accountScope,
    accountScopeKey,
  });

  function reportError(raw: unknown) {
    setError(toErrorMessage(raw));
  }

  function clearSearchState() {
    setError('');
    setItems(EMPTY_MOVEMENTS_SEARCH_ITEMS);
    setPagination(EMPTY_MOVEMENTS_SEARCH_PAGINATION);
    filtersModel.commands.resetForScopeChange();
    facetsModel.reset();
  }

  async function refreshResults() {
    const result = await runMovementsSearchQuery({
      core,
      accountScope,
      accountId,
      filters: filtersModel.appliedFilters,
      page,
    });
    setItems(result.items);
    setPagination(result.pagination);
    if (page !== result.page) {
      setPage(result.page);
    }
  }

  function ensureFilterOptionsLoaded() {
    void facetsModel.ensureLoaded().catch(reportError);
  }

  useEffect(() => {
    if (!enabled || accountScope.length === 0) {
      previousAccountScopeRef.current = accountScopeKey;
      setLoading(false);
      clearSearchState();
      return;
    }

    const accountChanged = previousAccountScopeRef.current !== accountScopeKey;
    if (accountChanged) {
      previousAccountScopeRef.current = accountScopeKey;
      clearSearchState();
      setLoading(true);
      setAccountScopeVersion((previous) => previous + 1);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await Promise.all([refreshResults(), facetsModel.ensureLoaded()]);
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
  }, [enabled, accountScopeKey, accountScopeVersion, page, filtersModel.appliedFilters]);

  useEffect(() => {
    ensureFilterOptionsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core]);

  const required: MovementsSearchModelRequired = {
    error,
    state: {
      source: filtersModel.filterDraft.source,
      items,
      filtersOpen: filtersModel.filtersOpen,
      filtersAdvancedOpen: filtersModel.filtersAdvancedOpen,
      searchApplied: filtersModel.searchApplied,
      filters: filtersModel.filterDraft,
      appliedFilters: filtersModel.appliedFilters,
      filterOptions: facetsModel.filterOptions,
      pagination,
    },
    status: {
      loading,
      disabled: loading,
    },
  };

  const filterCommands = filtersModel.commands;
  const provided: MovementsSearchModelProvided = {
    commands: {
      setSource: filterCommands.setSource,
      openFilters: () => {
        filterCommands.openFilters();
        ensureFilterOptionsLoaded();
      },
      closeFilters: filterCommands.closeFilters,
      toggleAdvancedFilters: () => {
        const shouldLoadOptions = !filtersModel.filtersAdvancedOpen;
        filterCommands.toggleAdvancedFilters();
        if (shouldLoadOptions) {
          ensureFilterOptionsLoaded();
        }
      },
      resetFilters: filterCommands.resetFilters,
      setFilterText: filterCommands.setFilterText,
      setFilterMerchant: filterCommands.setFilterMerchant,
      setFilterCategoryIds: filterCommands.setFilterCategoryIds,
      setFilterTagIds: filterCommands.setFilterTagIds,
      setFilterAmountMin: filterCommands.setFilterAmountMin,
      setFilterAmountMax: filterCommands.setFilterAmountMax,
      setFilterFromDate: filterCommands.setFilterFromDate,
      setFilterToDate: filterCommands.setFilterToDate,
      setFilterTypes: filterCommands.setFilterTypes,
      setSortField: filterCommands.setSortField,
      setSortDirection: filterCommands.setSortDirection,
      setPageSize: filterCommands.setPageSize,
      setGroupByDay: filterCommands.setGroupByDay,
      applyFilterPatch: filterCommands.applyFilterPatch,
      applyFilters: filterCommands.applyFilters,
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
