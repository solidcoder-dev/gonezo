import type {
  LedgerSortDirectionView,
  LedgerTransactionTypeView,
  MovementsFilterOptionsView,
  MovementsSearchFiltersState,
  MovementsSearchSortFieldView,
  MovementsSearchSourceView,
} from '../../application/movementsView.types';
import { MovementsSearchFilterSheetView } from './MovementsSearchFilterSheetView';
import './MovementsSearch.css';

export type MovementsSearchFiltersRequired = {
  state: {
    filtersOpen: boolean;
    filtersAdvancedOpen: boolean;
    searchApplied: boolean;
    filters: MovementsSearchFiltersState;
    appliedFilters: MovementsSearchFiltersState;
    filterOptions: MovementsFilterOptionsView;
  };
  status: {
    disabled: boolean;
  };
};

export type MovementsSearchFiltersProvided = {
  commands: {
    setSource: (value: MovementsSearchSourceView) => void;
    openFilters: () => void;
    closeFilters: () => void;
    toggleAdvancedFilters: () => void;
    resetFilters: () => void;
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

type MovementsSearchFiltersProps = {
  required: MovementsSearchFiltersRequired;
  provided: MovementsSearchFiltersProvided;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  clearPatch: Partial<MovementsSearchFiltersState>;
};

function summarizeNames(names: string[]): string {
  if (names.length <= 2) {
    return names.join(', ');
  }
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function buildActiveFilterChips(
  filters: MovementsSearchFiltersState,
  filterOptions: MovementsFilterOptionsView,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const categoryNameById = new Map(filterOptions.categories.map((item) => [item.id, item.label]));
  const tagNameById = new Map(filterOptions.tags.map((item) => [item.id, item.label]));

  if (filters.text.trim()) {
    chips.push({
      key: 'text',
      label: `Search: "${filters.text.trim()}"`,
      clearPatch: { text: '' },
    });
  }
  if (filters.merchant?.trim()) {
    chips.push({
      key: 'merchant',
      label: `Merchant: "${filters.merchant.trim()}"`,
      clearPatch: { merchant: '' },
    });
  }
  if (filters.fromDate.trim()) {
    chips.push({
      key: 'fromDate',
      label: `From ${filters.fromDate.trim()}`,
      clearPatch: { fromDate: '' },
    });
  }
  if (filters.toDate.trim()) {
    chips.push({
      key: 'toDate',
      label: `To ${filters.toDate.trim()}`,
      clearPatch: { toDate: '' },
    });
  }
  if (filters.categoryIds.length > 0) {
    const names = filters.categoryIds.map((id) => categoryNameById.get(id) ?? id);
    chips.push({
      key: 'categoryIds',
      label: `Categories: ${summarizeNames(names)}`,
      clearPatch: { categoryIds: [] },
    });
  }
  if (filters.tagIds.length > 0) {
    const names = filters.tagIds.map((id) => tagNameById.get(id) ?? id);
    chips.push({
      key: 'tagIds',
      label: `Tags: ${summarizeNames(names)}`,
      clearPatch: { tagIds: [] },
    });
  }
  if (filters.amountMin.trim() || filters.amountMax.trim()) {
    const min = filters.amountMin.trim() || '0';
    const max = filters.amountMax.trim() || '∞';
    chips.push({
      key: 'amount',
      label: `Amount: ${min} - ${max}`,
      clearPatch: { amountMin: '', amountMax: '' },
    });
  }
  if (filters.types.length > 0) {
    chips.push({
      key: 'types',
      label: `Type: ${filters.types.map((type) => type[0].toUpperCase() + type.slice(1)).join(', ')}`,
      clearPatch: { types: [] },
    });
  }
  if (filters.sortField !== 'date') {
    chips.push({
      key: 'sortField',
      label: 'Sort: Amount',
      clearPatch: { sortField: 'date' },
    });
  }
  if (filters.sortDirection !== 'desc') {
    chips.push({
      key: 'sortDirection',
      label: 'Order: Ascending',
      clearPatch: { sortDirection: 'desc' },
    });
  }
  if (filters.pageSize !== 10) {
    chips.push({
      key: 'pageSize',
      label: `Page size: ${filters.pageSize}`,
      clearPatch: { pageSize: 10 },
    });
  }
  if (filters.sortField === 'date' && !filters.groupByDay) {
    chips.push({
      key: 'groupByDay',
      label: 'Group: None',
      clearPatch: { groupByDay: true },
    });
  }

  return chips;
}

export function MovementsSearchFilters({ required, provided }: MovementsSearchFiltersProps) {
  const { filtersOpen, filtersAdvancedOpen, searchApplied, filters, appliedFilters, filterOptions } = required.state;
  const { disabled } = required.status;
  const activeFilterChips = buildActiveFilterChips(appliedFilters, filterOptions);
  const filtersButtonLabel = activeFilterChips.length > 0 ? `Filters ${activeFilterChips.length}` : 'Filters';

  return (
    <section className="stack search-controls" aria-label="Search controls">
      <div className="segmented" role="radiogroup" aria-label="Search source">
        <button
          type="button"
          className={filters.source === 'posted' ? 'segment selected' : 'segment'}
          aria-pressed={filters.source === 'posted'}
          onClick={() => provided.commands.setSource('posted')}
          disabled={disabled}
        >
          Posted
        </button>
        <button
          type="button"
          className={filters.source === 'scheduled' ? 'segment selected' : 'segment'}
          aria-pressed={filters.source === 'scheduled'}
          onClick={() => provided.commands.setSource('scheduled')}
          disabled={disabled}
        >
          Scheduled
        </button>
        <button
          type="button"
          className={filters.source === 'expected' ? 'segment selected' : 'segment'}
          aria-pressed={filters.source === 'expected'}
          onClick={() => provided.commands.setSource('expected')}
          disabled={disabled}
        >
          Expected
        </button>
      </div>

      <div className="search-input-wrap">
        <input
          type="search"
          aria-label="Search movements"
          value={filters.text}
          onChange={(event) => provided.commands.setFilterText(event.target.value)}
          placeholder="Search merchant or description"
          autoComplete="off"
        />
        <i className="bi bi-search" aria-hidden />
      </div>

      <div className="search-action-row">
        <button type="button" className="text-button" onClick={provided.commands.openFilters} disabled={disabled}>
          {filtersButtonLabel}
        </button>
        <button type="button" className="primary-cta" onClick={provided.commands.applyFilters} disabled={disabled}>
          Search
        </button>
      </div>

      {searchApplied && activeFilterChips.length > 0 ? (
        <div className="chip-row active-filter-row" aria-label="Applied filters">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="chip filter-chip"
              onClick={() => provided.commands.applyFilterPatch(chip.clearPatch)}
              disabled={disabled}
            >
              <span>{chip.label}</span>
              <i className="bi bi-x-lg" aria-hidden />
            </button>
          ))}
          <button type="button" className="text-button" onClick={provided.commands.resetFilters} disabled={disabled}>
            Clear all
          </button>
        </div>
      ) : null}

      <MovementsSearchFilterSheetView
        required={{
          config: {},
          data: { filters, filterOptions },
          state: {
            open: filtersOpen,
            advancedOpen: filtersAdvancedOpen,
          },
          status: { disabled },
        }}
        provided={{
          commands: {
            close: provided.commands.closeFilters,
            reset: provided.commands.resetFilters,
            apply: provided.commands.applyFilters,
            toggleAdvanced: provided.commands.toggleAdvancedFilters,
            setMerchant: provided.commands.setFilterMerchant,
            setFromDate: provided.commands.setFilterFromDate,
            setToDate: provided.commands.setFilterToDate,
            setTypes: provided.commands.setFilterTypes,
            setCategoryIds: provided.commands.setFilterCategoryIds,
            setAmountMin: provided.commands.setFilterAmountMin,
            setAmountMax: provided.commands.setFilterAmountMax,
            setTagIds: provided.commands.setFilterTagIds,
            setSortField: provided.commands.setSortField,
            setSortDirection: provided.commands.setSortDirection,
            setGroupByDay: provided.commands.setGroupByDay,
            setPageSize: provided.commands.setPageSize,
          },
        }}
      />
    </section>
  );
}
