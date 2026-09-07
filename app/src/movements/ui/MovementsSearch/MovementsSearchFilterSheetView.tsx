import { useState } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import type {
  LedgerTransactionTypeView,
  MovementsFilterOptionsView,
  MovementsSearchFiltersState,
  MovementsSearchSortFieldView,
  LedgerSortDirectionView,
} from '../../application/movementsView.types';
import './MovementsSearch.css';
import { SegmentedControlView } from '../../../shared/ui/SegmentedControlView';

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
          title: 'Filters',
          closeLabel: 'Close filters',
          contentClassName: 'vstack gap-4 search-filter-sheet-content',
          contentAriaLabel: 'Movement filters',
        },
        data: {
          body: (
            <>
              <div className="vstack gap-1">
                <label className="form-label text-secondary small mb-0" htmlFor="movement-filter-merchant">Merchant</label>
                <input
                  id="movement-filter-merchant"
                  className="form-control"
                  type="text"
                  aria-label="Merchant"
                  value={filters.merchant ?? ''}
                  onChange={(event) => provided.commands.setMerchant(event.target.value)}
                  placeholder="Merchant"
                  autoComplete="off"
                />
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Date</span>
                <div className="row g-2">
                  <div className="col-6 vstack gap-1">
                    <label className="form-label text-secondary small mb-0" htmlFor="movement-filter-from-date">From</label>
                    <input
                      id="movement-filter-from-date"
                      className="form-control"
                      type="date"
                      aria-label="From date"
                      value={filters.fromDate}
                      onChange={(event) => provided.commands.setFromDate(event.target.value)}
                    />
                  </div>
                  <div className="col-6 vstack gap-1">
                    <label className="form-label text-secondary small mb-0" htmlFor="movement-filter-to-date">To</label>
                    <input
                      id="movement-filter-to-date"
                      className="form-control"
                      type="date"
                      aria-label="To date"
                      value={filters.toDate}
                      onChange={(event) => provided.commands.setToDate(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Type</span>
                <div className="d-flex gap-2 movement-filter-chip-row">
                  {TYPE_FILTERS.map((option) => {
                    const selected = filters.types.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={selected ? 'btn movement-filter-chip selected' : 'btn movement-filter-chip'}
                        aria-pressed={selected}
                        onClick={() => provided.commands.setTypes(toggleValue(filters.types, option.value))}
                        disabled={disabled}
                      >
                        <span className="movement-filter-chip-surface">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Category</span>
                {filterOptions.categories.length > 0 ? (
                  <div className="d-flex gap-2 movement-filter-chip-row">
                    {visibleCategories.map((category) => {
                      const selected = filters.categoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={selected ? 'btn movement-filter-chip selected' : 'btn movement-filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.commands.setCategoryIds(toggleIdentifier(filters.categoryIds, category.id))}
                          disabled={disabled}
                        >
                          <span className="movement-filter-chip-surface">{category.label}</span>
                        </button>
                      );
                    })}
                    {hiddenCategoryCount > 0 ? (
                      <button
                        type="button"
                        className="btn movement-filter-chip movement-filter-chip-more"
                        onClick={() => setCategoriesExpanded(true)}
                        disabled={disabled}
                      >
                        <span className="movement-filter-chip-surface">+{hiddenCategoryCount} categories</span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-secondary small mb-0">No categories</p>
                )}
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Amount</span>
                <div className="row g-2">
                  <div className="col-6">
                    <input
                      className="form-control"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      aria-label="Min amount"
                      value={filters.amountMin}
                      onChange={(event) => provided.commands.setAmountMin(event.target.value)}
                      placeholder="Min"
                    />
                  </div>
                  <div className="col-6">
                    <input
                      className="form-control"
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
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Tags</span>
                {filterOptions.tags.length > 0 ? (
                  <div className="d-flex gap-2 movement-filter-chip-row">
                    {visibleTags.map((tag) => {
                      const selected = filters.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={selected ? 'btn movement-filter-chip selected' : 'btn movement-filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.commands.setTagIds(toggleIdentifier(filters.tagIds, tag.id))}
                          disabled={disabled}
                        >
                          <span className="movement-filter-chip-surface">#{tag.label}</span>
                        </button>
                      );
                    })}
                    {hiddenTagCount > 0 ? (
                      <button
                        type="button"
                        className="btn movement-filter-chip movement-filter-chip-more"
                        onClick={() => setTagsExpanded(true)}
                        disabled={disabled}
                      >
                        <span className="movement-filter-chip-surface">+{hiddenTagCount} tags</span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-secondary small mb-0">No tags</p>
                )}
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Sort by</span>
                <SegmentedControlView required={{ config: { ariaLabel: 'Sort by', columns: 2, variant: 'quiet' }, data: { options: [
                  { value: 'date', label: 'Date' }, { value: 'amount', label: 'Amount' },
                ] }, state: { value: filters.sortField }, status: { disabled } }} provided={{ commands: { select: provided.commands.setSortField } }} />
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Order</span>
                <SegmentedControlView required={{ config: { ariaLabel: 'Sort direction', columns: 2, variant: 'quiet' }, data: { options: [
                  { value: 'desc', label: 'Descending' }, { value: 'asc', label: 'Ascending' },
                ] }, state: { value: filters.sortDirection }, status: { disabled } }} provided={{ commands: { select: provided.commands.setSortDirection } }} />
              </div>

              <div className="vstack gap-2">
                <span className="text-secondary small">Group</span>
                <SegmentedControlView required={{ config: { ariaLabel: 'Group results', columns: 2, variant: 'quiet' }, data: { options: [
                  { value: 'day', label: 'By day', disabled: filters.sortField !== 'date' }, { value: 'none', label: 'None' },
                ] }, state: { value: filters.groupByDay ? 'day' : 'none' }, status: { disabled } }} provided={{ commands: { select: (value) => provided.commands.setGroupByDay(value === 'day') } }} />
              </div>

              {state.advancedOpen ? (
                <div className="vstack gap-2">
                  <span className="text-secondary small">Page size</span>
                  <div className="d-flex gap-2 movement-filter-chip-row" aria-label="Page size">
                    {pageSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={filters.pageSize === size ? 'btn movement-filter-chip selected' : 'btn movement-filter-chip'}
                        aria-pressed={filters.pageSize === size}
                        onClick={() => provided.commands.setPageSize(size)}
                        disabled={disabled}
                      >
                        <span className="movement-filter-chip-surface">{size}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="d-flex align-items-center justify-content-between w-100 btn btn-link text-secondary movement-filter-more-options"
                onClick={provided.commands.toggleAdvanced}
                disabled={disabled}
              >
                <span>{state.advancedOpen ? 'Less options' : 'More options'}</span>
                <i
                  className={state.advancedOpen
                    ? 'bi bi-chevron-up gz-composer-more-options-caret'
                    : 'bi bi-chevron-down gz-composer-more-options-caret'}
                  aria-hidden
                />
              </button>
            </>
          ),
          footer: (
            <div className="d-flex align-items-center gap-3 search-sheet-actions">
              <button type="button" className="btn btn-link text-secondary" onClick={provided.commands.reset} disabled={disabled}>
                Reset
              </button>
              <button type="button" className="btn btn-primary w-100" onClick={provided.commands.apply} disabled={disabled}>
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
