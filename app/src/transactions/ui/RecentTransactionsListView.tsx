import { useMemo } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { SchedulingMovementItem } from '../../shared/domain/corePort';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';
import type {
  TransactionHistoryFiltersState,
  TransactionHistoryOriginFilterValue,
  TransactionHistoryStatusFilterValue,
} from './TransactionHistoryView.contract';
import { formatCalendarDay, groupPostedTransactionsByDate } from './postedGrouping';
import { groupScheduledMovementsByDate } from './scheduledGrouping';

export type RecentTransactionsListViewRequired = {
  items: TransactionHistoryItemView[];
  scheduledItems: SchedulingMovementItem[];
  scheduledTotal: number;
  scheduledHasMore: boolean;
  filtersOpen: boolean;
  filtersAdvancedOpen: boolean;
  filters: TransactionHistoryFiltersState;
  appliedFilters: TransactionHistoryFiltersState;
  filterOptions: {
    categories: Array<{ id: string; label: string }>;
    tags: Array<{ id: string; label: string }>;
  };
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  loading: boolean;
  disabled: boolean;
  pendingVoidTransactionId?: string;
  pendingDeactivateScheduledId?: string;
};

export type RecentTransactionsListViewProvided = {
  onOpenFilters: () => void;
  onCloseFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onResetFilters: () => void;
  onFilterTextChange: (value: string) => void;
  onFilterCategoryIdsChange: (values: string[]) => void;
  onFilterTagIdsChange: (values: string[]) => void;
  onFilterAmountMinChange: (value: string) => void;
  onFilterAmountMaxChange: (value: string) => void;
  onFilterFromDateChange: (value: string) => void;
  onFilterToDateChange: (value: string) => void;
  onFilterStatusChange: (value: TransactionHistoryStatusFilterValue) => void;
  onFilterOriginChange: (value: TransactionHistoryOriginFilterValue) => void;
  onSortFieldChange: (value: 'occurredAt' | 'amount') => void;
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
  onPageSizeChange: (value: number) => void;
  onApplyFilterPatch: (patch: Partial<TransactionHistoryFiltersState>) => void;
  onApplyFilters: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onVoid: (transactionId: string) => void;
  onDeactivateScheduled: (scheduledMovementId: string) => Promise<void>;
};

export type RecentTransactionsListViewProps = {
  required: RecentTransactionsListViewRequired;
  provided: RecentTransactionsListViewProvided;
};

type ActiveFilterChip = {
  key: string;
  label: string;
  clearPatch: Partial<TransactionHistoryFiltersState>;
};

const STATUS_QUICK_FILTERS: Array<{ value: TransactionHistoryStatusFilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Upcoming' },
  { value: 'executed', label: 'Posted' },
  { value: 'voided', label: 'Voided' },
  { value: 'failed', label: 'Failed' },
];

const ORIGIN_QUICK_FILTERS: Array<{ value: TransactionHistoryOriginFilterValue; label: string }> = [
  { value: 'all', label: 'Any origin' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'one_shot', label: 'One-shot' },
  { value: 'manual', label: 'Manual' },
];

const DEFAULT_PAGE_SIZE = 10;

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

function buildActiveFilterChips(
  filters: TransactionHistoryFiltersState,
  filterOptions: RecentTransactionsListViewRequired['filterOptions'],
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
  if (filters.status !== 'all') {
    const option = STATUS_QUICK_FILTERS.find((candidate) => candidate.value === filters.status);
    chips.push({
      key: 'status',
      label: `Status: ${option?.label ?? filters.status}`,
      clearPatch: { status: 'all' },
    });
  }
  if (filters.origin !== 'all') {
    const option = ORIGIN_QUICK_FILTERS.find((candidate) => candidate.value === filters.origin);
    chips.push({
      key: 'origin',
      label: `Origin: ${option?.label ?? filters.origin}`,
      clearPatch: { origin: 'all' },
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
  if (filters.sortField !== 'occurredAt') {
    chips.push({
      key: 'sortField',
      label: filters.sortField === 'amount' ? 'Sort: Amount' : `Sort: ${filters.sortField}`,
      clearPatch: { sortField: 'occurredAt' },
    });
  }
  if (filters.sortDirection !== 'desc') {
    chips.push({
      key: 'sortDirection',
      label: 'Order: Ascending',
      clearPatch: { sortDirection: 'desc' },
    });
  }
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) {
    chips.push({
      key: 'pageSize',
      label: `Page size: ${filters.pageSize}`,
      clearPatch: { pageSize: DEFAULT_PAGE_SIZE },
    });
  }

  return chips;
}

export function RecentTransactionsListView({ required, provided }: RecentTransactionsListViewProps) {
  const {
    items,
    scheduledItems,
    scheduledTotal,
    scheduledHasMore,
    filtersOpen,
    filtersAdvancedOpen,
    filters,
    appliedFilters,
    filterOptions,
    pagination,
    loading,
    disabled,
    pendingVoidTransactionId,
    pendingDeactivateScheduledId,
  } = required;

  function txLabel(type: TransactionHistoryItemView['type']): string {
    if (type === 'income') return 'Income';
    if (type === 'expense') return 'Expense';
    if (type === 'transfer_in') return 'Transfer in';
    if (type === 'transfer_out') return 'Transfer out';
    return 'Transfer';
  }

  function txSign(type: TransactionHistoryItemView['type']): string {
    if (type === 'income' || type === 'transfer_in') return '+';
    if (type === 'expense' || type === 'transfer_out') return '-';
    return '';
  }

  function txItemTypeClass(type: TransactionHistoryItemView['type']): string {
    if (type === 'income' || type === 'transfer_in') {
      return 'expense-item expense-item--income';
    }
    if (type === 'transfer' || type === 'transfer_out') {
      return 'expense-item expense-item--transfer';
    }
    return 'expense-item expense-item--expense';
  }

  function movementTypeClass(type: SchedulingMovementItem['type']): string {
    if (type === 'income') {
      return 'expense-item expense-item--income';
    }
    if (type === 'transfer') {
      return 'expense-item expense-item--transfer';
    }
    return 'expense-item expense-item--expense';
  }

  function txKindIcon(type: TransactionHistoryItemView['type']): string {
    if (type === 'income' || type === 'transfer_in') return '↑';
    if (type === 'transfer' || type === 'transfer_out') return '⇄';
    return '↓';
  }

  function movementKindIcon(type: SchedulingMovementItem['type']): string {
    if (type === 'income') return '↑';
    if (type === 'transfer') return '⇄';
    return '↓';
  }

  function txAmount(amount: string, currency: string): string {
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) {
      return `${amount} ${currency}`;
    }
    return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
  }

  function scheduledStatus(item: SchedulingMovementItem): string {
    if (item.status === 'active') return 'scheduled';
    if (item.status === 'deactivated') return 'deactivated';
    if (item.status === 'completed') return 'completed';
    return item.status;
  }

  function scheduledOrigin(item: SchedulingMovementItem): string {
    const kind = resolveSchedulingKind(item);
    return kind === 'one_shot' ? 'one-shot' : 'recurring';
  }

  function compactTags(tags?: Array<{ id: string; name: string }>): string | undefined {
    if (!tags || tags.length === 0) {
      return undefined;
    }
    const visible = tags.slice(0, 2).map((tag) => `#${tag.name}`);
    if (tags.length > 2) {
      visible.push(`+${tags.length - 2}`);
    }
    return visible.join(' ');
  }

  function compactTagNames(tags?: string[]): string | undefined {
    if (!tags || tags.length === 0) {
      return undefined;
    }
    const visible = tags.slice(0, 2).map((tag) => `#${tag}`);
    if (tags.length > 2) {
      visible.push(`+${tags.length - 2}`);
    }
    return visible.join(' ');
  }

  const postedGroups = useMemo(() => groupPostedTransactionsByDate(items), [items]);
  const upcomingGroups = useMemo(() => groupScheduledMovementsByDate(scheduledItems), [scheduledItems]);
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(appliedFilters, filterOptions),
    [appliedFilters, filterOptions],
  );
  const categoryLabelById = useMemo(
    () => new Map(filterOptions.categories.map((item) => [item.id, item.label] as const)),
    [filterOptions.categories],
  );
  const tagLabelById = useMemo(
    () => new Map(filterOptions.tags.map((item) => [item.id, item.label] as const)),
    [filterOptions.tags],
  );

  const totalPagesLabel = pagination.totalPages > 0 ? pagination.totalPages : 1;
  const pageLabel = pagination.totalElements > 0 ? pagination.page + 1 : 1;

  function resolveScheduledCategoryName(categoryId?: string): string | undefined {
    if (!categoryId || categoryId.trim().length === 0) {
      return undefined;
    }
    return categoryLabelById.get(categoryId);
  }

  function resolveScheduledTagNames(movement: SchedulingMovementItem): string[] {
    const namesFromMovement = (movement.tagNames ?? [])
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    if (namesFromMovement.length > 0) {
      return namesFromMovement;
    }
    return (movement.tagIds ?? [])
      .map((tagId) => tagLabelById.get(tagId))
      .filter((name): name is string => Boolean(name && name.trim().length > 0));
  }

  return (
    <section className="stack section-gap transactions-section" aria-busy={loading}>
      <h2>Transactions</h2>

      <div className="chip-row" aria-label="Quick status filters">
        {STATUS_QUICK_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={appliedFilters.status === option.value ? 'chip filter-chip active' : 'chip filter-chip'}
            aria-pressed={appliedFilters.status === option.value}
            onClick={() => provided.onApplyFilterPatch({ status: option.value })}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="chip-row" aria-label="Quick origin filters">
        {ORIGIN_QUICK_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={appliedFilters.origin === option.value ? 'chip filter-chip active' : 'chip filter-chip'}
            aria-pressed={appliedFilters.origin === option.value}
            onClick={() => provided.onApplyFilterPatch({ origin: option.value })}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtersOpen ? (
        <div className="item-editor stack" aria-label="Transaction filters">
          <div className="quick-row">
            <input
              type="date"
              aria-label="From date"
              value={filters.fromDate}
              onChange={(event) => provided.onFilterFromDateChange(event.target.value)}
            />
            <input
              type="date"
              aria-label="To date"
              value={filters.toDate}
              onChange={(event) => provided.onFilterToDateChange(event.target.value)}
            />
          </div>

          <div className="quick-row">
            <button type="button" className="text-button" onClick={provided.onToggleAdvancedFilters} disabled={disabled}>
              {filtersAdvancedOpen ? 'Less options' : 'Advanced filters'}
            </button>
            <button type="button" className="text-button" onClick={provided.onResetFilters} disabled={disabled}>
              Reset
            </button>
          </div>

          {filtersAdvancedOpen ? (
            <div className="stack" aria-label="Advanced transaction filters">
              <div className="stack">
                <p className="hint">Categories</p>
                {filterOptions.categories.length > 0 ? (
                  <div className="chip-row">
                    {filterOptions.categories.map((category) => {
                      const selected = filters.categoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={selected ? 'chip filter-chip active' : 'chip filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.onFilterCategoryIdsChange(toggleIdentifier(filters.categoryIds, category.id))}
                          disabled={disabled}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="hint">No categories</p>
                )}
              </div>

              <div className="stack">
                <p className="hint">Tags</p>
                {filterOptions.tags.length > 0 ? (
                  <div className="chip-row">
                    {filterOptions.tags.map((tag) => {
                      const selected = filters.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={selected ? 'chip filter-chip active' : 'chip filter-chip'}
                          aria-pressed={selected}
                          onClick={() => provided.onFilterTagIdsChange(toggleIdentifier(filters.tagIds, tag.id))}
                          disabled={disabled}
                        >
                          #{tag.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="hint">No tags</p>
                )}
              </div>

              <div className="quick-row">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  aria-label="Min amount"
                  value={filters.amountMin}
                  onChange={(event) => provided.onFilterAmountMinChange(event.target.value)}
                  placeholder="Min amount"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  aria-label="Max amount"
                  value={filters.amountMax}
                  onChange={(event) => provided.onFilterAmountMaxChange(event.target.value)}
                  placeholder="Max amount"
                />
              </div>

              <div className="stack">
                <p className="hint">Sort by</p>
                <div className="segmented segmented-2" role="radiogroup" aria-label="Sort by">
                  <button
                    type="button"
                    className={filters.sortField === 'occurredAt' ? 'segment active' : 'segment'}
                    aria-pressed={filters.sortField === 'occurredAt'}
                    onClick={() => provided.onSortFieldChange('occurredAt')}
                    disabled={disabled}
                  >
                    Date
                  </button>
                  <button
                    type="button"
                    className={filters.sortField === 'amount' ? 'segment active' : 'segment'}
                    aria-pressed={filters.sortField === 'amount'}
                    onClick={() => provided.onSortFieldChange('amount')}
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
                    className={filters.sortDirection === 'desc' ? 'segment active' : 'segment'}
                    aria-pressed={filters.sortDirection === 'desc'}
                    onClick={() => provided.onSortDirectionChange('desc')}
                    disabled={disabled}
                  >
                    Descending
                  </button>
                  <button
                    type="button"
                    className={filters.sortDirection === 'asc' ? 'segment active' : 'segment'}
                    aria-pressed={filters.sortDirection === 'asc'}
                    onClick={() => provided.onSortDirectionChange('asc')}
                    disabled={disabled}
                  >
                    Ascending
                  </button>
                </div>
              </div>

              <div className="stack">
                <p className="hint">Page size</p>
                <div className="chip-row" aria-label="Page size">
                  {[5, 10, 20].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={filters.pageSize === size ? 'chip filter-chip active' : 'chip filter-chip'}
                      aria-pressed={filters.pageSize === size}
                      onClick={() => provided.onPageSizeChange(size)}
                      disabled={disabled}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

        </div>
      ) : null}

      <div className="quick-row transactions-search-row">
        <input
          aria-label="Search transactions"
          value={filters.text}
          onChange={(event) => provided.onFilterTextChange(event.target.value)}
          placeholder="Search merchant or description"
          autoComplete="off"
        />
        <button
          type="button"
          className="text-button"
          onClick={filtersOpen ? provided.onCloseFilters : provided.onOpenFilters}
          disabled={disabled}
        >
          {filtersOpen ? 'Hide filters' : 'More filters'}
        </button>
        <button type="button" onClick={provided.onApplyFilters} disabled={disabled}>
          Search
        </button>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="chip-row active-filter-row" aria-label="Applied filters">
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="chip filter-chip"
              onClick={() => provided.onApplyFilterPatch(chip.clearPatch)}
              disabled={disabled}
            >
              {chip.label} x
            </button>
          ))}
          <button type="button" className="text-button" onClick={provided.onResetFilters} disabled={disabled}>
            Clear all
          </button>
        </div>
      ) : null}

      {loading ? <p role="status">Loading transactions...</p> : null}
      {!loading && scheduledItems.length === 0 && items.length === 0 ? <p>No movements yet.</p> : null}
      {!loading && scheduledItems.length > 0 ? (
        <div className="stack">
          <div className="inline-header">
            <h3>Upcoming</h3>
            <span className="hint">
              {scheduledTotal}
              {scheduledHasMore ? ' (showing first items)' : ''}
            </span>
          </div>
          {upcomingGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Upcoming group ${group.label}`}>
                {group.items.map((movement) => {
                  const scheduledCategoryName = resolveScheduledCategoryName(movement.categoryId);
                  const details = [
                    `${scheduledOrigin(movement)} · due ${formatCalendarDay(movement.nextDueAt ?? movement.startAt)}`,
                    scheduledCategoryName,
                    compactTagNames(resolveScheduledTagNames(movement)),
                  ].filter((value): value is string => Boolean(value && value.trim().length > 0));
                  const detailsLabel = details.join(' · ');
                  return (
                    <li key={movement.id} className={`${movementTypeClass(movement.type)} expense-item--compact`}>
                      <div className="expense-top-row compact-row">
                        <div className="tx-head compact-main">
                          <span aria-hidden>{movementKindIcon(movement.type)}</span>
                          <strong className="compact-title">{movement.merchant || movement.description || 'Scheduled movement'}</strong>
                        </div>
                        <strong>
                          {movement.type === 'income' ? '+' : movement.type === 'transfer' ? '⇄' : '-'}
                          {txAmount(movement.amount, movement.currency)}
                        </strong>
                      </div>
                      <div className="expense-bottom-row compact-row">
                        <span className="hint compact-subline">{detailsLabel}</span>
                        {movement.status === 'active' ? (
                          <button
                            type="button"
                            className="text-button compact-action"
                            onClick={() => void provided.onDeactivateScheduled(movement.id)}
                            disabled={disabled || pendingDeactivateScheduledId === movement.id}
                          >
                            {pendingDeactivateScheduledId === movement.id ? 'Deactivating…' : 'Deactivate'}
                          </button>
                        ) : (
                          <span className="chip">{scheduledStatus(movement)}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {scheduledHasMore ? (
            <div className="quick-row">
              <button type="button" className="text-button" disabled>
                See all upcoming
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!loading && postedGroups.length > 0 ? (
        <div className="stack" aria-label="Posted movements">
          <div className="inline-header">
            <h3>Posted</h3>
            <span className="hint">{pagination.totalElements} items</span>
          </div>
          {postedGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Posted group ${group.label}`}>
                {group.items.map((transaction) => (
                  <li key={transaction.id} className={`${txItemTypeClass(transaction.type)} expense-item--compact`}>
                    <div className="expense-top-row compact-row">
                      <div className="tx-head compact-main">
                        <span aria-hidden>{txKindIcon(transaction.type)}</span>
                        <strong className="compact-title">{transaction.merchant || transaction.description || txLabel(transaction.type)}</strong>
                      </div>
                      <strong>
                        {txSign(transaction.type)}
                        {txAmount(transaction.amount, transaction.currency)}
                      </strong>
                    </div>
                    <div className="expense-bottom-row compact-row">
                      <span className="hint compact-subline">
                        {[
                          transaction.category?.name,
                          compactTags(transaction.tags),
                          transaction.categorizationStatus
                            && transaction.categorizationStatus !== 'assigned'
                            && transaction.categorizationStatus !== 'none'
                            ? `Category: ${transaction.categorizationStatus}`
                            : undefined,
                          transaction.taggingStatus
                            && transaction.taggingStatus !== 'assigned'
                            && transaction.taggingStatus !== 'none'
                            ? `Tags: ${transaction.taggingStatus}`
                            : undefined,
                          transaction.status !== 'posted' ? `Status: ${transaction.status}` : undefined,
                        ].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(' · ')}
                      </span>
                      {transaction.status === 'posted' ? (
                        <button
                          type="button"
                          className="text-button compact-action"
                          disabled={disabled || pendingVoidTransactionId === transaction.id}
                          onClick={() => provided.onVoid(transaction.id)}
                        >
                          {pendingVoidTransactionId === transaction.id ? 'Pending…' : 'Void'}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <div className="inline-header">
        <p className="hint">Page {pageLabel} of {totalPagesLabel} · {pagination.totalElements} posted</p>
        <div className="quick-row">
          <button
            type="button"
            className="text-button"
            onClick={provided.onPreviousPage}
            disabled={disabled || !pagination.hasPrevious}
          >
            Previous
          </button>
          <button
            type="button"
            className="text-button"
            onClick={provided.onNextPage}
            disabled={disabled || !pagination.hasNext}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
