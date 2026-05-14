import { useState } from 'react';
import { SheetView } from '../../shared/ui/SheetView';
import type { ViewProps } from '../../shared/ui/ViewProps';
import type {
  LedgerTransactionTypeView,
  MovementsFilterOptionsView,
  MovementsSearchFiltersState,
  MovementsSearchSortFieldView,
  LedgerSortDirectionView,
} from '../domain/movementsView.types';

type FilterOptionView = {
  value: LedgerTransactionTypeView;
  label: string;
};

const TYPE_FILTERS: FilterOptionView[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const DEFAULT_PAGE_SIZES = [5, 10, 20];
const DEFAULT_FILTER_OPTION_COLLAPSE_LIMIT = 6;

export type MovementsSearchFilterSheetViewProps = ViewProps<
  {
    categoryCollapseLimit?: number;
    tagCollapseLimit?: number;
    pageSizes?: number[];
  },
  {
    filters: MovementsSearchFiltersState;
    filterOptions: MovementsFilterOptionsView;
  },
  {
    open: boolean;
    advancedOpen: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    close: () => void;
    reset: () => void;
    apply: () => void;
    toggleAdvanced: () => void;
    setMerchant: (value: string) => void;
    setFromDate: (value: string) => void;
    setToDate: (value: string) => void;
    setTypes: (values: LedgerTransactionTypeView[]) => void;
    setCategoryIds: (values: string[]) => void;
    setAmountMin: (value: string) => void;
    setAmountMax: (value: string) => void;
    setTagIds: (values: string[]) => void;
    setSortField: (value: MovementsSearchSortFieldView) => void;
    setSortDirection: (value: LedgerSortDirectionView) => void;
    setGroupByDay: (value: boolean) => void;
    setPageSize: (value: number) => void;
  }
>;

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

export function MovementsSearchFilterSheetView({
  required,
  provided,
}: MovementsSearchFilterSheetViewProps) {
  const { config, data, state, status } = required;
  const { filters, filterOptions } = data;
  const disabled = status.disabled;
  const categoryCollapseLimit = config.categoryCollapseLimit ?? DEFAULT_FILTER_OPTION_COLLAPSE_LIMIT;
  const tagCollapseLimit = config.tagCollapseLimit ?? DEFAULT_FILTER_OPTION_COLLAPSE_LIMIT;
  const pageSizes = config.pageSizes ?? DEFAULT_PAGE_SIZES;
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const visibleCategories = categoriesExpanded
    ? filterOptions.categories
    : filterOptions.categories.slice(0, categoryCollapseLimit);
  const hiddenCategoryCount = filterOptions.categories.length - visibleCategories.length;
  const visibleTags = tagsExpanded
    ? filterOptions.tags
    : filterOptions.tags.slice(0, tagCollapseLimit);
  const hiddenTagCount = filterOptions.tags.length - visibleTags.length;

  return (
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
                onClick={provided.commands.close}
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
                onChange={(event) => provided.commands.setMerchant(event.target.value)}
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
                    onChange={(event) => provided.commands.setFromDate(event.target.value)}
                  />
                  <input
                    type="date"
                    aria-label="To date"
                    value={filters.toDate}
                    onChange={(event) => provided.commands.setToDate(event.target.value)}
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
                        onClick={() => provided.commands.setTypes(toggleValue(filters.types, option.value))}
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
                          onClick={() => provided.commands.setCategoryIds(toggleIdentifier(filters.categoryIds, category.id))}
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
                    onChange={(event) => provided.commands.setAmountMin(event.target.value)}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    aria-label="Max amount"
                    value={filters.amountMax}
                    onChange={(event) => provided.commands.setAmountMax(event.target.value)}
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
                          onClick={() => provided.commands.setTagIds(toggleIdentifier(filters.tagIds, tag.id))}
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

              {state.advancedOpen ? (
                <div className="stack">
                  <p className="hint">Page size</p>
                  <div className="chip-row" aria-label="Page size">
                    {pageSizes.map((size) => (
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

              <button
                type="button"
                className="composer-more-options"
                onClick={provided.commands.toggleAdvanced}
                disabled={disabled}
              >
                <span>{state.advancedOpen ? 'Less options' : 'More options'}</span>
                <i
                  className={state.advancedOpen
                    ? 'bi bi-chevron-up composer-more-options-caret'
                    : 'bi bi-chevron-down composer-more-options-caret'}
                  aria-hidden
                />
              </button>
            </>
          ),
          footer: (
            <div className="search-sheet-actions">
              <button type="button" className="text-button" onClick={provided.commands.reset} disabled={disabled}>
                Reset
              </button>
              <button type="button" className="primary-cta" onClick={provided.commands.apply} disabled={disabled}>
                Apply
              </button>
            </div>
          ),
        },
        state: { open: state.open },
        status: {},
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}
