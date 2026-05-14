import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { TransactionHistoryItemView } from '../../transactions/domain/transactionView.types';
import { formatCalendarDay, groupPostedTransactionsByDate } from '../../transactions/ui/postedGrouping';
import { groupScheduledMovementsByDate } from '../../transactions/ui/scheduledGrouping';
import type { ExpectedMovementView, ScheduledMovementView } from '../domain/movementsView.types';
import { MonthNavigatorView } from './MonthNavigatorView';
import { MonthPickerModalView } from './MonthPickerModalView';
import {
  MovementDetailSheetView,
  type MovementAmountKindView,
  type MovementDetailActionView,
} from './MovementDetailSheetView';
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

function txAmountKind(type: TransactionHistoryItemView['type']): MovementAmountKindView {
  if (type === 'income' || type === 'transfer_in') {
    return 'income';
  }
  if (type === 'transfer' || type === 'transfer_out') {
    return 'transfer';
  }
  return 'expense';
}

type MovementVisualType = ScheduledMovementView['type'] | ExpectedMovementView['type'];

type ExpectedDateGroup = {
  key: string;
  label: string;
  items: ExpectedMovementView[];
};

function movementTypeClass(type: MovementVisualType): string {
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

function movementKindIconClass(type: MovementVisualType): string {
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

function movementAmountSign(type: MovementVisualType): ReactNode {
  if (type === 'income') {
    return '+';
  }
  if (type === 'transfer') {
    return <i className="bi bi-arrow-left-right movement-amount-transfer-icon" aria-hidden />;
  }
  return '-';
}

function movementDetailActions(actions: Array<MovementDetailActionView | undefined>): MovementDetailActionView[] {
  return actions.filter((action): action is MovementDetailActionView => Boolean(action));
}

function scheduledStatus(item: ScheduledMovementView): string {
  if (item.status === 'active') return 'scheduled';
  if (item.status === 'deactivated') return 'deactivated';
  if (item.status === 'completed') return 'completed';
  return item.status;
}

function scheduledOrigin(item: ScheduledMovementView): string {
  const kind = resolveSchedulingKind(item);
  return kind === 'one_shot' ? 'one-shot' : 'recurring';
}

function expectedOrigin(item: ExpectedMovementView): string {
  return item.originOccurrenceId ? 'recurring' : 'manual';
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

function groupExpectedMovementsByDate(items: ExpectedMovementView[]): ExpectedDateGroup[] {
  const sorted = [...items].sort((left, right) => {
    const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
    return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
  });
  const groups: ExpectedDateGroup[] = [];
  for (const item of sorted) {
    const date = new Date(item.expectedAt);
    const key = Number.isNaN(date.getTime()) ? item.expectedAt.slice(0, 10) : date.toISOString().slice(0, 10);
    const existing = groups[groups.length - 1];
    if (existing && existing.key === key) {
      existing.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: formatCalendarDay(item.expectedAt),
      items: [item],
    });
  }
  return groups;
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
    expectedItems,
    expectedTotal,
    pagination,
    filterOptions,
    pendingVoidTransactionId,
    pendingDeactivateScheduledId,
    pendingDismissExpectedId,
  } = required.state;
  const { loading, disabled } = required.status;
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHistoryItemView | null>(null);
  const [selectedScheduledMovement, setSelectedScheduledMovement] = useState<ScheduledMovementView | null>(null);
  const [selectedExpectedMovement, setSelectedExpectedMovement] = useState<ExpectedMovementView | null>(null);
  const expansionScope = `${accountId}:${monthLabel}`;
  const [expansionState, setExpansionState] = useState({
    scope: expansionScope,
    expected: false,
    scheduled: false,
  });
  const expectedExpanded = expansionState.scope === expansionScope ? expansionState.expected : false;
  const scheduledExpanded = expansionState.scope === expansionScope ? expansionState.scheduled : false;

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
  const expectedGroups = useMemo(() => groupExpectedMovementsByDate(expectedItems), [expectedItems]);
  const showScheduledSection = viewedYear > currentYear
    || (viewedYear === currentYear && viewedMonthIndex >= currentMonthIndex);
  const expectedHasItems = expectedTotal > 0;
  const scheduledHasItems = scheduledTotal > 0;

  const searchHref = `/movements/search?accountId=${encodeURIComponent(accountId)}`;

  function toggleExpectedExpanded() {
    setExpansionState((previous) => previous.scope === expansionScope
      ? { ...previous, expected: !previous.expected }
      : { scope: expansionScope, expected: true, scheduled: false });
  }

  function toggleScheduledExpanded() {
    setExpansionState((previous) => previous.scope === expansionScope
      ? { ...previous, scheduled: !previous.scheduled }
      : { scope: expansionScope, expected: false, scheduled: true });
  }

  function resolveScheduledCategoryName(categoryId?: string): string | undefined {
    if (!categoryId || categoryId.trim().length === 0) {
      return undefined;
    }
    return categoryLabelById.get(categoryId);
  }

  function resolveExpectedCategoryName(categoryId?: string): string | undefined {
    if (!categoryId || categoryId.trim().length === 0) {
      return undefined;
    }
    return categoryLabelById.get(categoryId);
  }

  function resolveScheduledTagNames(movement: ScheduledMovementView): string[] {
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
        <h2>Movements</h2>
        <Link className="text-button icon-button" to={searchHref} aria-label="Search movements">
          <i className="bi bi-search" aria-hidden />
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
        <div className="stack" aria-label="Expected movements">
          {expectedHasItems ? (
            <button
              type="button"
              className="account-menu-trigger movement-section-trigger"
              aria-label={`${expectedExpanded ? 'Collapse' : 'Expand'} expected movements (${expectedTotal})`}
              aria-expanded={expectedExpanded}
              onClick={toggleExpectedExpanded}
            >
              <span>Expected</span>
              <span className="movement-section-count">
                {expectedTotal}
              </span>
              <i className={expectedExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'} aria-hidden />
            </button>
          ) : (
            <div className="inline-header">
              <h3>Expected</h3>
              <span className="hint">0</span>
            </div>
          )}
          {expectedExpanded ? expectedGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Expected group ${group.label}`}>
                {group.items.map((movement) => {
                  const expectedCategoryName = resolveExpectedCategoryName(movement.categoryId);
                  const details = [
                    `expected ${formatCalendarDay(movement.expectedAt)}`,
                    expectedOrigin(movement),
                    expectedCategoryName,
                    movement.status,
                  ].filter((value): value is string => Boolean(value && value.trim().length > 0));
                  return (
                    <li key={movement.id} className={`${movementTypeClass(movement.type)} expense-item--compact`}>
                      <button
                        type="button"
                        className="expense-item-button expense-item-button--compact"
                        onClick={() => setSelectedExpectedMovement(movement)}
                        disabled={disabled}
                      >
                        <div className="expense-top-row compact-row">
                          <div className="tx-head compact-main">
                            <i className={movementKindIconClass(movement.type)} aria-hidden />
                            <strong className="compact-title">{movement.merchant || movement.description || 'Expected movement'}</strong>
                          </div>
                          <strong>
                            {movement.type === 'income' ? '+' : '-'}
                            {txAmount(movement.amount, movement.currency)}
                          </strong>
                        </div>
                        <div className="expense-bottom-row compact-row">
                          <span className="hint compact-subline">{details.join(' · ')}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )) : null}
        </div>
      ) : null}

      {!loading && showScheduledSection ? (
        <div className="stack" aria-label="Scheduled movements">
          {scheduledHasItems ? (
            <button
              type="button"
              className="account-menu-trigger movement-section-trigger"
              aria-label={`${scheduledExpanded ? 'Collapse' : 'Expand'} scheduled movements (${scheduledTotal})`}
              aria-expanded={scheduledExpanded}
              onClick={toggleScheduledExpanded}
            >
              <span>Scheduled</span>
              <span className="movement-section-count">
                {scheduledTotal}
              </span>
              <i className={scheduledExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'} aria-hidden />
            </button>
          ) : (
            <div className="inline-header">
              <h3>Scheduled</h3>
              <span className="hint">0</span>
            </div>
          )}
          {scheduledExpanded ? upcomingGroups.map((group) => (
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
                      <button
                        type="button"
                        className="expense-item-button expense-item-button--compact"
                        onClick={() => setSelectedScheduledMovement(movement)}
                        disabled={disabled}
                      >
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
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )) : null}
        </div>
      ) : null}

      {!loading ? (
        <div className="stack" aria-label="Posted movements">
          <div className="inline-header">
            <h3>Posted</h3>
            <span className="hint">{pagination.totalElements}</span>
          </div>
          {postedGroups.length === 0 ? <p className="hint">No posted movements in {monthLabel}.</p> : null}
          {postedGroups.map((group) => (
            <div key={group.key} className="stack">
              <p className="hint date-group-label">{group.label}</p>
              <ul className="expense-list expense-list--compact" aria-label={`Posted group ${group.label}`}>
                {group.items.map((transaction) => (
                  <li key={transaction.id} className={`${txItemTypeClass(transaction.type)} expense-item--compact`}>
                    <button
                      type="button"
                      className="expense-item-button expense-item-button--compact"
                      onClick={() => setSelectedTransaction(transaction)}
                      disabled={disabled}
                    >
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
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {selectedTransaction ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Transaction details',
              closeLabel: 'Close transaction details',
            },
            data: {
              title: selectedTransaction.merchant || selectedTransaction.description || txLabel(selectedTransaction.type),
              kicker: txLabel(selectedTransaction.type),
              iconClassName: txKindIconClass(selectedTransaction.type),
              amount: {
                kind: txAmountKind(selectedTransaction.type),
                sign: txSign(selectedTransaction.type),
                value: selectedTransaction.amount,
                currency: selectedTransaction.currency,
              },
              meta: [
                { label: 'Date', value: formatCalendarDay(selectedTransaction.occurredAt) },
                { label: 'Category', value: selectedTransaction.category?.name ?? 'No category' },
                { label: 'Tags', value: compactTags(selectedTransaction.tags) ?? 'No tags' },
                { label: 'Status', value: selectedTransaction.status },
              ],
              splitItems: selectedTransaction.items,
              actions: movementDetailActions([
                selectedTransaction.status === 'posted' ? {
                  key: 'void',
                  label: pendingVoidTransactionId === selectedTransaction.id ? 'Pending...' : 'Void movement',
                  variant: 'danger',
                  disabled: pendingVoidTransactionId === selectedTransaction.id,
                  onClick: () => {
                    provided.commands.requestVoid(selectedTransaction.id);
                    setSelectedTransaction(null);
                  },
                } : undefined,
                {
                  key: 'close',
                  label: 'Close',
                  variant: 'text',
                  onClick: () => setSelectedTransaction(null),
                },
              ]),
            },
            state: { open: true },
            status: { disabled },
          }}
          provided={{ commands: { close: () => setSelectedTransaction(null) } }}
        />
      ) : null}

      {selectedExpectedMovement ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Expected movement details',
              closeLabel: 'Close expected movement details',
            },
            data: {
              title: selectedExpectedMovement.merchant || selectedExpectedMovement.description || 'Expected movement',
              kicker: 'Expected',
              iconClassName: movementKindIconClass(selectedExpectedMovement.type),
              amount: {
                kind: 'scheduled',
                sign: movementAmountSign(selectedExpectedMovement.type),
                value: selectedExpectedMovement.amount,
                currency: selectedExpectedMovement.currency,
              },
              meta: [
                { label: 'Expected', value: formatCalendarDay(selectedExpectedMovement.expectedAt) },
                { label: 'Category', value: resolveExpectedCategoryName(selectedExpectedMovement.categoryId) ?? 'No category' },
                { label: 'Origin', value: expectedOrigin(selectedExpectedMovement) },
                { label: 'Status', value: selectedExpectedMovement.status },
              ],
              splitItems: selectedExpectedMovement.splitItems,
              actions: [
                {
                  key: 'post',
                  label: 'Post movement',
                  onClick: () => {
                    void provided.commands.postExpectedMovement(
                      selectedExpectedMovement,
                      resolveExpectedCategoryName(selectedExpectedMovement.categoryId),
                    ).then((posted) => {
                      if (posted) {
                        setSelectedExpectedMovement(null);
                      }
                    });
                  },
                },
                {
                  key: 'edit',
                  label: 'Edit expected',
                  variant: 'text',
                  onClick: () => {
                    provided.commands.editExpectedMovement(
                      selectedExpectedMovement,
                      resolveExpectedCategoryName(selectedExpectedMovement.categoryId),
                    );
                    setSelectedExpectedMovement(null);
                  },
                },
                {
                  key: 'remove',
                  label: pendingDismissExpectedId === selectedExpectedMovement.id ? 'Removing...' : 'Remove movement',
                  variant: 'text-danger',
                  disabled: pendingDismissExpectedId === selectedExpectedMovement.id,
                  onClick: () => {
                    void provided.commands.dismissExpectedMovement(selectedExpectedMovement).then((dismissed) => {
                      if (dismissed) {
                        setSelectedExpectedMovement(null);
                      }
                    });
                  },
                },
                {
                  key: 'close',
                  label: 'Close',
                  variant: 'text',
                  onClick: () => setSelectedExpectedMovement(null),
                },
              ],
            },
            state: { open: true },
            status: { disabled },
          }}
          provided={{ commands: { close: () => setSelectedExpectedMovement(null) } }}
        />
      ) : null}

      {showScheduledSection && scheduledHasItems && selectedScheduledMovement ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Scheduled movement details',
              closeLabel: 'Close scheduled movement details',
            },
            data: {
              title: selectedScheduledMovement.merchant || selectedScheduledMovement.description || 'Scheduled movement',
              kicker: 'Scheduled',
              iconClassName: movementKindIconClass(selectedScheduledMovement.type),
              amount: {
                kind: 'scheduled',
                sign: movementAmountSign(selectedScheduledMovement.type),
                value: selectedScheduledMovement.amount,
                currency: selectedScheduledMovement.currency,
              },
              meta: [
                { label: 'Due', value: formatCalendarDay(selectedScheduledMovement.nextDueAt ?? selectedScheduledMovement.startAt) },
                { label: 'Origin', value: scheduledOrigin(selectedScheduledMovement) },
                { label: 'Category', value: resolveScheduledCategoryName(selectedScheduledMovement.categoryId) ?? 'No category' },
                { label: 'Tags', value: compactTagNames(resolveScheduledTagNames(selectedScheduledMovement)) ?? 'No tags' },
                { label: 'Status', value: scheduledStatus(selectedScheduledMovement) },
              ],
              splitItems: selectedScheduledMovement.splitItems,
              actions: movementDetailActions([
                selectedScheduledMovement.status === 'active' ? {
                  key: 'edit',
                  label: 'Edit movement',
                  variant: 'text',
                  onClick: () => {
                    provided.commands.editScheduledMovement(
                      selectedScheduledMovement,
                      resolveScheduledCategoryName(selectedScheduledMovement.categoryId),
                    );
                    setSelectedScheduledMovement(null);
                  },
                } : undefined,
                selectedScheduledMovement.status === 'active' ? {
                  key: 'deactivate',
                  label: pendingDeactivateScheduledId === selectedScheduledMovement.id ? 'Deactivating...' : 'Deactivate movement',
                  variant: 'danger',
                  disabled: pendingDeactivateScheduledId === selectedScheduledMovement.id,
                  onClick: () => {
                    void provided.commands.deactivateScheduledMovement(selectedScheduledMovement.id);
                    setSelectedScheduledMovement(null);
                  },
                } : undefined,
                {
                  key: 'close',
                  label: 'Close',
                  variant: 'text',
                  onClick: () => setSelectedScheduledMovement(null),
                },
              ]),
            },
            state: { open: true },
            status: { disabled },
          }}
          provided={{ commands: { close: () => setSelectedScheduledMovement(null) } }}
        />
      ) : null}

    </section>
  );
}
