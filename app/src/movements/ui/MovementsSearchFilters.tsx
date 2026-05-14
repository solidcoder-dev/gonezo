import { useState } from 'react';
import { SheetView } from '../../shared/ui/SheetView';
import type {
  LedgerTransactionTypeView,
  MovementsSearchFiltersState,
  MovementsSearchModelProvided,
  MovementsSearchModelRequired,
} from '../domain/movementsView.types';

type MovementsSearchFiltersProps = {
  required: Pick<MovementsSearchModelRequired, 'error' | 'state' | 'status'>;
  provided: Pick<MovementsSearchModelProvided, 'commands'>;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  clearPatch: Partial<MovementsSearchFiltersState>;
};

const TYPE_FILTERS: Array<{ value: LedgerTransactionTypeView; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const PAGE_SIZES = [5, 10, 20];
const FILTER_OPTION_COLLAPSE_LIMIT = 6;

function summarizeNames(names: string[]): string {
  if (names.length <= 2) {
    return names.join(', ');
  }
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function toggleIdentifier(values: string[], candidate: string): string[] {
  if (values.includes(candidate)) {
    return values.filter((value) => value !== candidate);
  }
  return [...values, candidate];
}

function toggleValue(
  values: LedgerTransactionTypeView[],
  candidate: LedgerTransactionTypeView,
): LedgerTransactionTypeView[] {
  if (values.includes(candidate)) {
    return values.filter((value) => value !== candidate);
  }
  return [...values, candidate];
}

function buildActiveFilterChips(
  filters: MovementsSearchFiltersState,
  filterOptions: MovementsSearchModelRequired['state']['filterOptions'],
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
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const activeFilterChips = buildActiveFilterChips(appliedFilters, filterOptions);
  const filtersButtonLabel = activeFilterChips.length > 0 ? `Filters ${activeFilterChips.length}` : 'Filters';
  const visibleCategories = categoriesExpanded
    ? filterOptions.categories
    : filterOptions.categories.slice(0, FILTER_OPTION_COLLAPSE_LIMIT);
  const hiddenCategoryCount = filterOptions.categories.length - visibleCategories.length;
  const visibleTags = tagsExpanded
    ? filterOptions.tags
    : filterOptions.tags.slice(0, FILTER_OPTION_COLLAPSE_LIMIT);
  const hiddenTagCount = filterOptions.tags.length - visibleTags.length;

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

      {filtersOpen ? (
        <SheetView
          required={{
            config: {
              ariaLabel: 'Filters',
              panelClassName: 'search-filter-sheet',
              contentClassName: 'stack search-filter-sheet-content',
              contentAriaLabel: 'Movement filters',
            },
            data: {
              header: (
                <div className="detail-sheet-header">
                  <div className="detail-sheet-title">
                    <h3>Filters</h3>
                  </div>
                  <button
                    type="button"
                    className="text-button icon-button"
                    aria-label="Close filters"
                    onClick={provided.commands.closeFilters}
                  >
                    <i className="bi bi-x-lg" aria-hidden />
                  </button>
                </div>
              ),
              body: (
                <>
              <input
                type="text"
                aria-label="Merchant"
                value={filters.merchant ?? ''}
                onChange={(event) => provided.commands.setFilterMerchant(event.target.value)}
                placeholder="Merchant"
                autoComplete="off"
              />

              <div className="stack">
                <p className="hint">Date</p>
                <div className="quick-row">
                  <input
                    type="date"
                    aria-label="From date"
                    value={filters.fromDate}
                    onChange={(event) => provided.commands.setFilterFromDate(event.target.value)}
                  />
                  <input
                    type="date"
                    aria-label="To date"
                    value={filters.toDate}
                    onChange={(event) => provided.commands.setFilterToDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="stack">
                <p className="hint">Type</p>
                <div className="chip-row">
                  {TYPE_FILTERS.map((option) => {
                    const selected = filters.types.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={selected ? 'chip filter-chip selected' : 'chip filter-chip'}
                        aria-pressed={selected}
                        onClick={() => provided.commands.setFilterTypes(toggleValue(filters.types, option.value))}
                        disabled={disabled}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="stack">
                <p className="hint">Category</p>
                {filterOptions.categories.length > 0 ? (
                  <div className="chip-row">
                    {visibleCategories.map((category) => {
                      const selected = filters.categoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={selected ? 'chip filter-chip selected' : 'chip filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.commands.setFilterCategoryIds(toggleIdentifier(filters.categoryIds, category.id))}
                          disabled={disabled}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                    {hiddenCategoryCount > 0 ? (
                      <button
                        type="button"
                        className="chip filter-chip filter-chip-more"
                        onClick={() => setCategoriesExpanded(true)}
                        disabled={disabled}
                      >
                        +{hiddenCategoryCount} categories
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="hint">No categories</p>
                )}
              </div>

              <div className="stack">
                <p className="hint">Amount</p>
                <div className="quick-row">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    aria-label="Min amount"
                    value={filters.amountMin}
                    onChange={(event) => provided.commands.setFilterAmountMin(event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    aria-label="Max amount"
                    value={filters.amountMax}
                    onChange={(event) => provided.commands.setFilterAmountMax(event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="stack">
                <p className="hint">Tags</p>
                {filterOptions.tags.length > 0 ? (
                  <div className="chip-row">
                    {visibleTags.map((tag) => {
                      const selected = filters.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={selected ? 'chip filter-chip selected' : 'chip filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.commands.setFilterTagIds(toggleIdentifier(filters.tagIds, tag.id))}
                          disabled={disabled}
                        >
                          #{tag.label}
                        </button>
                      );
                    })}
                    {hiddenTagCount > 0 ? (
                      <button
                        type="button"
                        className="chip filter-chip filter-chip-more"
                        onClick={() => setTagsExpanded(true)}
                        disabled={disabled}
                      >
                        +{hiddenTagCount} tags
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="hint">No tags</p>
                )}
              </div>

              <div className="stack">
                <p className="hint">Sort by</p>
                <div className="segmented segmented-2" role="radiogroup" aria-label="Sort by">
                  <button
                    type="button"
                    className={filters.sortField === 'date' ? 'segment selected' : 'segment'}
                    aria-pressed={filters.sortField === 'date'}
                    onClick={() => provided.commands.setSortField('date')}
                    disabled={disabled}
                  >
                    Date
                  </button>
                  <button
                    type="button"
                    className={filters.sortField === 'amount' ? 'segment selected' : 'segment'}
                    aria-pressed={filters.sortField === 'amount'}
                    onClick={() => provided.commands.setSortField('amount')}
                    disabled={disabled}
                  >
                    Amount
                  </button>
                </div>
              </div>

              <div className="stack">
                <p className="hint">Order</p>
                <div className="segmented segmented-2" role="radiogroup" aria-label="Sort direction">
                  <button
                    type="button"
                    className={filters.sortDirection === 'desc' ? 'segment selected' : 'segment'}
                    aria-pressed={filters.sortDirection === 'desc'}
                    onClick={() => provided.commands.setSortDirection('desc')}
                    disabled={disabled}
                  >
                    Descending
                  </button>
                  <button
                    type="button"
                    className={filters.sortDirection === 'asc' ? 'segment selected' : 'segment'}
                    aria-pressed={filters.sortDirection === 'asc'}
                    onClick={() => provided.commands.setSortDirection('asc')}
                    disabled={disabled}
                  >
                    Ascending
                  </button>
                </div>
              </div>

              <div className="stack">
                <p className="hint">Group</p>
                <div className="segmented segmented-2" role="radiogroup" aria-label="Group results">
                  <button
                    type="button"
                    className={filters.groupByDay ? 'segment selected' : 'segment'}
                    aria-pressed={filters.groupByDay}
                    onClick={() => provided.commands.setGroupByDay(true)}
                    disabled={disabled || filters.sortField !== 'date'}
                  >
                    By day
                  </button>
                  <button
                    type="button"
                    className={!filters.groupByDay ? 'segment selected' : 'segment'}
                    aria-pressed={!filters.groupByDay}
                    onClick={() => provided.commands.setGroupByDay(false)}
                    disabled={disabled}
                  >
                    None
                  </button>
                </div>
              </div>

              {filtersAdvancedOpen ? (
                <div className="stack">
                  <p className="hint">Page size</p>
                  <div className="chip-row" aria-label="Page size">
                    {PAGE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={filters.pageSize === size ? 'chip filter-chip selected' : 'chip filter-chip'}
                      aria-pressed={filters.pageSize === size}
                      onClick={() => provided.commands.setPageSize(size)}
                      disabled={disabled}
                    >
                      {size}
                    </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button type="button" className="composer-more-options" onClick={provided.commands.toggleAdvancedFilters} disabled={disabled}>
                <span>{filtersAdvancedOpen ? 'Less options' : 'More options'}</span>
                <i className={filtersAdvancedOpen ? 'bi bi-chevron-up composer-more-options-caret' : 'bi bi-chevron-down composer-more-options-caret'} aria-hidden />
              </button>
                </>
              ),
              footer: (
                <div className="search-sheet-actions">
                  <button type="button" className="text-button" onClick={provided.commands.resetFilters} disabled={disabled}>
                    Reset
                  </button>
                  <button type="button" className="primary-cta" onClick={provided.commands.applyFilters} disabled={disabled}>
                    Apply
                  </button>
                </div>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: provided.commands.closeFilters } }}
        />
      ) : null}
    </section>
  );
}
