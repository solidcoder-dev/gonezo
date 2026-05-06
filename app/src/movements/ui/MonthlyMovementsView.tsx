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

function renderSplitItems(items: Array<{ id: string; name: string; amount: string }>): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="stack detail-split-list">
      <span className="hint detail-meta-label">Splits</span>
      <ul className="expense-list expense-list--compact" aria-label="Split items">
        {items.map((item) => (
          <li key={item.id} className="expense-item expense-item--compact">
            <div className="inline-header">
              <strong>{item.name}</strong>
              <span>{item.amount}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
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
    scheduledHasMore,
    expectedItems,
    expectedTotal,
    expectedHasMore,
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
                {expectedHasMore ? ' (preview)' : ''}
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
          {expectedExpanded && expectedHasMore ? (
            <div className="quick-row">
              <Link className="text-button" to={searchHref}>
                See all expected
              </Link>
            </div>
          ) : null}
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
                {scheduledHasMore ? ' (preview)' : ''}
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
          {scheduledExpanded && scheduledHasMore ? (
            <div className="quick-row">
              <Link className="text-button" to={searchHref}>
                See all scheduled
              </Link>
            </div>
          ) : null}
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
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedTransaction(null)}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inline-header">
              <h3>{selectedTransaction.merchant || selectedTransaction.description || txLabel(selectedTransaction.type)}</h3>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close transaction details"
                onClick={() => setSelectedTransaction(null)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <p className="summary-amount">
              {txSign(selectedTransaction.type)}
              {txAmount(selectedTransaction.amount, selectedTransaction.currency)}
            </p>
            <div className="stack">
              <p className="hint">{formatCalendarDay(selectedTransaction.occurredAt)}</p>
              <p className="hint">{selectedTransaction.category?.name ?? 'No category'}</p>
              <p className="hint">{compactTags(selectedTransaction.tags) ?? 'No tags'}</p>
              <p className="hint">Status: {selectedTransaction.status}</p>
            </div>
            {renderSplitItems(selectedTransaction.items)}
            <div className="quick-row">
              {selectedTransaction.status === 'posted' ? (
                <button
                  type="button"
                  className="danger-button"
                  disabled={disabled || pendingVoidTransactionId === selectedTransaction.id}
                  onClick={() => {
                    provided.commands.requestVoid(selectedTransaction.id);
                    setSelectedTransaction(null);
                  }}
                >
                  {pendingVoidTransactionId === selectedTransaction.id ? 'Pending...' : 'Void movement'}
                </button>
              ) : null}
              <button type="button" className="text-button" onClick={() => setSelectedTransaction(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedExpectedMovement ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedExpectedMovement(null)}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Expected movement details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-sheet-header">
              <div className="detail-sheet-title">
                <span className="detail-sheet-kicker">
                  <i className={movementKindIconClass(selectedExpectedMovement.type)} aria-hidden />
                  <span>Expected</span>
                </span>
                <h3>{selectedExpectedMovement.merchant || selectedExpectedMovement.description || 'Expected movement'}</h3>
              </div>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close expected movement details"
                onClick={() => setSelectedExpectedMovement(null)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="detail-sheet-amount detail-sheet-amount--scheduled">
              {selectedExpectedMovement.type === 'income' ? '+' : '-'}
              {txAmount(selectedExpectedMovement.amount, selectedExpectedMovement.currency)}
            </div>
            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Expected</span>
                <strong>{formatCalendarDay(selectedExpectedMovement.expectedAt)}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Category</span>
                <strong>{resolveExpectedCategoryName(selectedExpectedMovement.categoryId) ?? 'No category'}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Origin</span>
                <strong>{expectedOrigin(selectedExpectedMovement)}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Status</span>
                <strong>{selectedExpectedMovement.status}</strong>
              </div>
            </div>
            {renderSplitItems(selectedExpectedMovement.splitItems)}
            <div className="detail-actions">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  void provided.commands.postExpectedMovement(
                    selectedExpectedMovement,
                    resolveExpectedCategoryName(selectedExpectedMovement.categoryId),
                  ).then((posted) => {
                    if (posted) {
                      setSelectedExpectedMovement(null);
                    }
                  });
                }}
              >
                Post movement
              </button>
              <button
                type="button"
                className="text-button"
                disabled={disabled}
                onClick={() => {
                  provided.commands.editExpectedMovement(
                    selectedExpectedMovement,
                    resolveExpectedCategoryName(selectedExpectedMovement.categoryId),
                  );
                  setSelectedExpectedMovement(null);
                }}
              >
                Edit expected
              </button>
              <button
                type="button"
                className="text-button danger-button"
                disabled={disabled || pendingDismissExpectedId === selectedExpectedMovement.id}
                onClick={() => {
                  void provided.commands.dismissExpectedMovement(selectedExpectedMovement).then((dismissed) => {
                    if (dismissed) {
                      setSelectedExpectedMovement(null);
                    }
                  });
                }}
              >
                {pendingDismissExpectedId === selectedExpectedMovement.id ? 'Removing...' : 'Remove movement'}
              </button>
              <button type="button" className="text-button" onClick={() => setSelectedExpectedMovement(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showScheduledSection && scheduledHasItems && selectedScheduledMovement ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedScheduledMovement(null)}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Scheduled movement details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-sheet-header">
              <div className="detail-sheet-title">
                <span className="detail-sheet-kicker">
                  <i className={movementKindIconClass(selectedScheduledMovement.type)} aria-hidden />
                  <span>Scheduled</span>
                </span>
                <h3>{selectedScheduledMovement.merchant || selectedScheduledMovement.description || 'Scheduled movement'}</h3>
              </div>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close scheduled movement details"
                onClick={() => setSelectedScheduledMovement(null)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="detail-sheet-amount detail-sheet-amount--scheduled">
              {selectedScheduledMovement.type === 'income' ? '+' : null}
              {selectedScheduledMovement.type === 'transfer' ? <i className="bi bi-arrow-left-right movement-amount-transfer-icon" aria-hidden /> : null}
              {selectedScheduledMovement.type === 'expense' ? '-' : null}
              {txAmount(selectedScheduledMovement.amount, selectedScheduledMovement.currency)}
            </div>
            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Due</span>
                <strong>{formatCalendarDay(selectedScheduledMovement.nextDueAt ?? selectedScheduledMovement.startAt)}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Origin</span>
                <strong>{scheduledOrigin(selectedScheduledMovement)}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Category</span>
                <strong>{resolveScheduledCategoryName(selectedScheduledMovement.categoryId) ?? 'No category'}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Tags</span>
                <strong>{compactTagNames(resolveScheduledTagNames(selectedScheduledMovement)) ?? 'No tags'}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Status</span>
                <strong>{scheduledStatus(selectedScheduledMovement)}</strong>
              </div>
            </div>
            {renderSplitItems(selectedScheduledMovement.splitItems)}
            <div className="detail-actions">
              {selectedScheduledMovement.status === 'active' ? (
                <button
                  type="button"
                  className="danger-button"
                  disabled={disabled || pendingDeactivateScheduledId === selectedScheduledMovement.id}
                  onClick={() => {
                    void provided.commands.deactivateScheduledMovement(selectedScheduledMovement.id);
                    setSelectedScheduledMovement(null);
                  }}
                >
                  {pendingDeactivateScheduledId === selectedScheduledMovement.id ? 'Deactivating...' : 'Deactivate movement'}
                </button>
              ) : null}
              <button type="button" className="text-button" onClick={() => setSelectedScheduledMovement(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

    </section>
  );
}
