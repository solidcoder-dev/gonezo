import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { SchedulingMovementItem } from '../../shared/domain/corePort';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { TransactionHistoryItemView } from '../../transactions/domain/transactionView.types';
import { formatCalendarDay, groupPostedTransactionsByDate } from '../../transactions/ui/postedGrouping';
import { groupScheduledMovementsByDate } from '../../transactions/ui/scheduledGrouping';
import { MonthNavigatorView } from './MonthNavigatorView';
import { MonthPickerModalView } from './MonthPickerModalView';
import { YearMonthSelectorView } from './YearMonthSelectorView';
import type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

export type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

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

function txKindIconClass(type: TransactionHistoryItemView['type']): string {
  if (type === 'income' || type === 'transfer_in') return 'bi bi-arrow-up-right';
  if (type === 'transfer' || type === 'transfer_out') return 'bi bi-arrow-left-right';
  return 'bi bi-arrow-down-right';
}

function movementKindIconClass(type: SchedulingMovementItem['type']): string {
  if (type === 'income') return 'bi bi-arrow-up-right';
  if (type === 'transfer') return 'bi bi-arrow-left-right';
  return 'bi bi-arrow-down-right';
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

export function MonthlyMovementsView({ required, provided }: MonthlyMovementsViewProps) {
  const {
    accountId,
    monthLabel,
    isCurrentMonth,
    monthMenuOpen,
    monthPickerOpen,
    monthPickerYear,
    viewedMonthIndex,
    viewedYear,
    currentMonthIndex,
    currentYear,
    items,
    scheduledItems,
    scheduledTotal,
    scheduledHasMore,
    pagination,
    filterOptions,
    pendingVoidTransactionId,
    pendingDeactivateScheduledId,
  } = required.state;
  const { loading, disabled } = required.status;

  const categoryLabelById = useMemo(
    () => new Map(filterOptions.categories.map((item) => [item.id, item.label] as const)),
    [filterOptions.categories],
  );
  const tagLabelById = useMemo(
    () => new Map(filterOptions.tags.map((item) => [item.id, item.label] as const)),
    [filterOptions.tags],
  );

  const postedGroups = useMemo(() => groupPostedTransactionsByDate(items), [items]);
  const upcomingGroups = useMemo(() => groupScheduledMovementsByDate(scheduledItems), [scheduledItems]);

  const searchHref = `/movements/search?accountId=${encodeURIComponent(accountId)}`;
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
      <div className="inline-header">
        <h2>Transactions</h2>
        <Link className="text-button" to={searchHref}>
          Advanced search
        </Link>
      </div>

      <MonthNavigatorView
        required={{
          monthLabel,
          disabled,
          monthMenuOpen,
          isCurrentMonth,
        }}
        provided={{
          onPreviousMonth: provided.commands.goToPreviousMonth,
          onNextMonth: provided.commands.goToNextMonth,
          onToggleMenu: provided.commands.toggleMonthMenu,
          onGoToCurrentMonth: provided.commands.goToCurrentMonth,
          onOpenMonthPicker: provided.commands.openMonthPicker,
        }}
      />

      <MonthPickerModalView
        required={{
          open: monthPickerOpen,
        }}
        provided={{
          onDismiss: provided.commands.closeMonthPicker,
        }}
      >
        <YearMonthSelectorView
          required={{
            year: monthPickerYear,
            viewedYear,
            viewedMonthIndex,
            currentYear,
            currentMonthIndex,
            disabled,
          }}
          provided={{
            onPreviousYear: provided.commands.goToPreviousPickerYear,
            onNextYear: provided.commands.goToNextPickerYear,
            onSelectMonth: provided.commands.selectPickerMonth,
          }}
        />
      </MonthPickerModalView>

      {loading ? <p role="status">Loading monthly movements...</p> : null}

      {!loading ? (
        <div className="stack">
          <div className="inline-header">
            <h3>Scheduled</h3>
            <span className="hint">
              {scheduledTotal}
              {scheduledHasMore ? ' (preview)' : ''}
            </span>
          </div>
          {upcomingGroups.length === 0 ? <p className="hint">No scheduled movements in {monthLabel}.</p> : null}
          {upcomingGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Scheduled group ${group.label}`}>
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
                          <i className={movementKindIconClass(movement.type)} aria-hidden />
                          <strong className="compact-title">{movement.merchant || movement.description || 'Scheduled movement'}</strong>
                        </div>
                        <strong>
                          {movement.type === 'income' ? '+' : null}
                          {movement.type === 'transfer' ? <i className="bi bi-arrow-left-right movement-amount-transfer-icon" aria-hidden /> : null}
                          {movement.type === 'expense' ? '-' : null}
                          {txAmount(movement.amount, movement.currency)}
                        </strong>
                      </div>
                      <div className="expense-bottom-row compact-row">
                        <span className="hint compact-subline">{detailsLabel}</span>
                        {movement.status === 'active' ? (
                          <button
                            type="button"
                            className="text-button compact-action"
                            onClick={() => void provided.commands.deactivateScheduledMovement(movement.id)}
                            disabled={disabled || pendingDeactivateScheduledId === movement.id}
                          >
                            {pendingDeactivateScheduledId === movement.id ? 'Deactivating...' : 'Deactivate'}
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
              <Link className="text-button" to={searchHref}>
                See all upcoming
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading ? (
        <div className="stack" aria-label="Posted movements">
          <div className="inline-header">
            <h3>Posted</h3>
            <span className="hint">{pagination.totalElements} items</span>
          </div>
          {postedGroups.length === 0 ? <p className="hint">No posted movements in {monthLabel}.</p> : null}
          {postedGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Posted group ${group.label}`}>
                {group.items.map((transaction) => (
                  <li key={transaction.id} className={`${txItemTypeClass(transaction.type)} expense-item--compact`}>
                    <div className="expense-top-row compact-row">
                      <div className="tx-head compact-main">
                        <i className={txKindIconClass(transaction.type)} aria-hidden />
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
                        ].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(' · ')}
                      </span>
                      {transaction.status === 'posted' ? (
                        <button
                          type="button"
                          className="text-button compact-action"
                          disabled={disabled || pendingVoidTransactionId === transaction.id}
                          onClick={() => provided.commands.requestVoid(transaction.id)}
                        >
                          {pendingVoidTransactionId === transaction.id ? 'Pending...' : 'Void'}
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

      {pagination.totalElements > 0 ? (
        <div className="inline-header">
          <p className="hint">Page {pageLabel} of {totalPagesLabel} · {pagination.totalElements} posted</p>
          <div className="quick-row">
            <button
              type="button"
              className="text-button"
              onClick={provided.commands.goToPreviousPage}
              disabled={disabled || !pagination.hasPrevious}
            >
              Previous
            </button>
            <button
              type="button"
              className="text-button"
              onClick={provided.commands.goToNextPage}
              disabled={disabled || !pagination.hasNext}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
