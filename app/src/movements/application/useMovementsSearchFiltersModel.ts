import { useState } from 'react';
import type {
  MovementsSearchFiltersState,
  MovementsSearchSortFieldView,
  MovementsSearchSourceView,
  LedgerSortDirectionView,
  LedgerTransactionTypeView,
} from '../domain/movementsView.types';
import {
  createDefaultMovementsSearchFilters,
  DEFAULT_MOVEMENTS_SEARCH_FILTERS,
  mergeMovementsSearchFilterPatch,
  normalizeMovementSearchIdentifierList,
} from './movementsSearchFilters';

type UseMovementsSearchFiltersModelInput = {
  resetPage: () => void;
};

export type MovementsSearchFiltersModel = {
  filtersOpen: boolean;
  filtersAdvancedOpen: boolean;
  searchApplied: boolean;
  filterDraft: MovementsSearchFiltersState;
  appliedFilters: MovementsSearchFiltersState;
  commands: {
    setSource: (value: MovementsSearchSourceView) => void;
    openFilters: () => void;
    closeFilters: () => void;
    toggleAdvancedFilters: () => void;
    resetFilters: () => void;
    resetForScopeChange: () => void;
    setFilterText: (value: string) => void;
    setFilterMerchant: (value: string) => void;
    setFilterCategoryIds: (values: string[]) => void;
    setFilterTagIds: (values: string[]) => void;
    setFilterAmountMin: (value: string) => void;
    setFilterAmountMax: (value: string) => void;
    setFilterFromDate: (value: string) => void;
    setFilterToDate: (value: string) => void;
    setFilterTypes: (values: LedgerTransactionTypeView[]) => void;
    setSortField: (value: MovementsSearchSortFieldView) => void;
    setSortDirection: (value: LedgerSortDirectionView) => void;
    setPageSize: (value: number) => void;
    setGroupByDay: (value: boolean) => void;
    applyFilterPatch: (patch: Partial<MovementsSearchFiltersState>) => void;
    applyFilters: () => void;
  };
};

function sameValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameFilters(
  left: MovementsSearchFiltersState,
  right: MovementsSearchFiltersState,
): boolean {
  return left.source === right.source
    && left.text === right.text
    && left.merchant === right.merchant
    && sameValues(left.categoryIds, right.categoryIds)
    && sameValues(left.tagIds, right.tagIds)
    && left.amountMin === right.amountMin
    && left.amountMax === right.amountMax
    && left.fromDate === right.fromDate
    && left.toDate === right.toDate
    && sameValues(left.types, right.types)
    && left.sortField === right.sortField
    && left.sortDirection === right.sortDirection
    && left.pageSize === right.pageSize
    && left.groupByDay === right.groupByDay;
}

function resetToDefaultFilters(previous: MovementsSearchFiltersState): MovementsSearchFiltersState {
  return sameFilters(previous, DEFAULT_MOVEMENTS_SEARCH_FILTERS)
    ? previous
    : createDefaultMovementsSearchFilters();
}

export function useMovementsSearchFiltersModel(
  input: UseMovementsSearchFiltersModelInput,
): MovementsSearchFiltersModel {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersAdvancedOpen, setFiltersAdvancedOpen] = useState(false);
  const [searchApplied, setSearchApplied] = useState(false);
  const [filterDraft, setFilterDraft] = useState<MovementsSearchFiltersState>(createDefaultMovementsSearchFilters);
  const [appliedFilters, setAppliedFilters] = useState<MovementsSearchFiltersState>(createDefaultMovementsSearchFilters);

  function resetSearchState() {
    setFiltersOpen(false);
    setFiltersAdvancedOpen(false);
    setSearchApplied(false);
    setFilterDraft(resetToDefaultFilters);
    setAppliedFilters(resetToDefaultFilters);
    input.resetPage();
  }

  return {
    filtersOpen,
    filtersAdvancedOpen,
    searchApplied,
    filterDraft,
    appliedFilters,
    commands: {
      setSource: (value) => {
        setFilterDraft((previous) => ({ ...previous, source: value }));
        setAppliedFilters((previous) => ({ ...previous, source: value }));
        setSearchApplied(true);
        input.resetPage();
      },
      openFilters: () => {
        setFiltersOpen(true);
        setFiltersAdvancedOpen(false);
      },
      closeFilters: () => {
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      toggleAdvancedFilters: () => {
        setFiltersAdvancedOpen((previous) => !previous);
      },
      resetFilters: resetSearchState,
      resetForScopeChange: resetSearchState,
      setFilterText: (value) => setFilterDraft((previous) => ({ ...previous, text: value })),
      setFilterMerchant: (value) => setFilterDraft((previous) => ({ ...previous, merchant: value })),
      setFilterCategoryIds: (values) => setFilterDraft((previous) => ({
        ...previous,
        categoryIds: normalizeMovementSearchIdentifierList(values),
      })),
      setFilterTagIds: (values) => setFilterDraft((previous) => ({
        ...previous,
        tagIds: normalizeMovementSearchIdentifierList(values),
      })),
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
        const normalized = Number.isFinite(value) && value > 0
          ? Math.min(Math.trunc(value), 100)
          : DEFAULT_MOVEMENTS_SEARCH_FILTERS.pageSize;
        setFilterDraft((previous) => ({ ...previous, pageSize: normalized }));
      },
      setGroupByDay: (value) => setFilterDraft((previous) => ({ ...previous, groupByDay: value })),
      applyFilterPatch: (patch) => {
        const nextFilters = mergeMovementsSearchFilterPatch(appliedFilters, patch);
        setFilterDraft(nextFilters);
        setAppliedFilters(nextFilters);
        setSearchApplied(true);
        input.resetPage();
      },
      applyFilters: () => {
        setAppliedFilters(mergeMovementsSearchFilterPatch(filterDraft, {}));
        setSearchApplied(true);
        input.resetPage();
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
    },
  };
}
