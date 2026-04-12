import { useMemo } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { SchedulingMovementItem } from '../../shared/domain/corePort';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';
import type { TransactionHistoryOriginFilterValue, TransactionHistoryStatusFilterValue } from './TransactionHistoryView.contract';
import { formatCalendarDay, groupPostedTransactionsByDate } from './postedGrouping';
import { groupScheduledMovementsByDate } from './scheduledGrouping';

export type RecentTransactionsListViewRequired = {
  items: TransactionHistoryItemView[];
  scheduledItems: SchedulingMovementItem[];
  scheduledTotal: number;
  scheduledHasMore: boolean;
  filtersOpen: boolean;
  filtersAdvancedOpen: boolean;
  filters: {
    text: string;
    categoryIds: string[];
    tagIds: string[];
    amountMin: string;
    amountMax: string;
    fromDate: string;
    toDate: string;
    status: TransactionHistoryStatusFilterValue;
    origin: TransactionHistoryOriginFilterValue;
    sortField: 'occurredAt' | 'amount';
    sortDirection: 'asc' | 'desc';
    pageSize: number;
  };
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

export function RecentTransactionsListView({ required, provided }: RecentTransactionsListViewProps) {
  const {
    items,
    scheduledItems,
    scheduledTotal,
    scheduledHasMore,
    filtersOpen,
    filtersAdvancedOpen,
    filters,
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

  const totalPagesLabel = pagination.totalPages > 0 ? pagination.totalPages : 1;
  const pageLabel = pagination.totalElements > 0 ? pagination.page + 1 : 1;

  return (
    <section className="stack section-gap transactions-section" aria-busy={loading}>
      <div className="inline-header">
        <h2>Transactions</h2>
        {filtersOpen ? (
          <button type="button" className="text-button" onClick={provided.onCloseFilters} disabled={disabled}>
            Close
          </button>
        ) : (
          <button type="button" className="text-button" onClick={provided.onOpenFilters} disabled={disabled}>
            Filter
          </button>
        )}
      </div>

      {filtersOpen ? (
        <div className="item-editor stack" aria-label="Transaction filters">
          <label className="stack">
            Search
            <input
              aria-label="Search transactions"
              value={filters.text}
              onChange={(event) => provided.onFilterTextChange(event.target.value)}
              placeholder="Merchant or description"
              autoComplete="off"
            />
          </label>

          <div className="quick-row">
            <label className="stack">
              From date
              <input
                type="date"
                aria-label="From date"
                value={filters.fromDate}
                onChange={(event) => provided.onFilterFromDateChange(event.target.value)}
              />
            </label>
            <label className="stack">
              To date
              <input
                type="date"
                aria-label="To date"
                value={filters.toDate}
                onChange={(event) => provided.onFilterToDateChange(event.target.value)}
              />
            </label>

          <label className="stack">
            Status
            <select
                aria-label="Transaction status"
              value={filters.status}
              onChange={(event) => provided.onFilterStatusChange(event.target.value as TransactionHistoryStatusFilterValue)}
            >
              <option value="all">All</option>
              <option value="scheduled">Upcoming</option>
              <option value="executed">Posted</option>
              <option value="voided">Voided</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label className="stack">
            Origin
            <select
              aria-label="Movement origin"
              value={filters.origin}
              onChange={(event) => provided.onFilterOriginChange(event.target.value as TransactionHistoryOriginFilterValue)}
            >
              <option value="all">All</option>
              <option value="recurring">Recurring</option>
              <option value="one_shot">One-shot</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>

          <div className="quick-row">
            <button type="button" className="text-button" onClick={provided.onToggleAdvancedFilters} disabled={disabled}>
              {filtersAdvancedOpen ? 'Less filters' : 'More filters'}
            </button>
            <button type="button" className="text-button" onClick={provided.onResetFilters} disabled={disabled}>
              Reset
            </button>
          </div>

          {filtersAdvancedOpen ? (
            <div className="stack" aria-label="Advanced transaction filters">
              <div className="quick-row">
                <label className="stack">
                  Categories
                  <select
                    multiple
                    aria-label="Categories"
                    value={filters.categoryIds}
                    onChange={(event) =>
                      provided.onFilterCategoryIdsChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
                  >
                    {filterOptions.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="stack">
                  Tags
                  <select
                    multiple
                    aria-label="Tags"
                    value={filters.tagIds}
                    onChange={(event) =>
                      provided.onFilterTagIdsChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))}
                  >
                    {filterOptions.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="stack">
                  Min amount
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    aria-label="Min amount"
                    value={filters.amountMin}
                    onChange={(event) => provided.onFilterAmountMinChange(event.target.value)}
                  />
                </label>

                <label className="stack">
                  Max amount
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    aria-label="Max amount"
                    value={filters.amountMax}
                    onChange={(event) => provided.onFilterAmountMaxChange(event.target.value)}
                  />
                </label>
              </div>

              <div className="quick-row">
                <label className="stack">
                  Sort by
                  <select
                    aria-label="Sort by"
                    value={filters.sortField}
                    onChange={(event) => provided.onSortFieldChange(event.target.value as 'occurredAt' | 'amount')}
                  >
                    <option value="occurredAt">Date</option>
                    <option value="amount">Amount</option>
                  </select>
                </label>

                <label className="stack">
                  Order
                  <select
                    aria-label="Sort direction"
                    value={filters.sortDirection}
                    onChange={(event) => provided.onSortDirectionChange(event.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </label>

                <label className="stack">
                  Page size
                  <select
                    aria-label="Page size"
                    value={filters.pageSize}
                    onChange={(event) => provided.onPageSizeChange(Number(event.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          <div className="quick-row">
            <button type="button" onClick={provided.onApplyFilters} disabled={disabled}>
              Search
            </button>
          </div>
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
                  const details = [
                    `${scheduledOrigin(movement)} · due ${formatCalendarDay(movement.nextDueAt ?? movement.startAt)}`,
                    movement.categoryId,
                    compactTagNames(movement.tagNames),
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
                          transaction.categorizationStatus && transaction.categorizationStatus !== 'assigned'
                            ? `Category: ${transaction.categorizationStatus}`
                            : undefined,
                          transaction.taggingStatus && transaction.taggingStatus !== 'assigned'
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
