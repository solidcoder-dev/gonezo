import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TransactionHistoryItemView } from '../../transactions/domain/transactionView.types';
import { groupPostedTransactionsByDate } from '../../transactions/ui/postedGrouping';
import { groupScheduledMovementsByDate } from '../../transactions/ui/scheduledGrouping';
import type { ExpectedMovementView, ScheduledMovementView } from '../domain/movementsView.types';
import { MonthNavigatorView } from './MonthNavigatorView';
import { MonthPickerModalView } from './MonthPickerModalView';
import {
  MovementDetailSheetView,
  type MovementDetailActionView,
} from './MovementDetailSheetView';
import { MovementRowView } from './MovementRowView';
import { MovementSectionView } from './MovementSectionView';
import { YearMonthSelectorView } from './YearMonthSelectorView';
import {
  buildExpectedMovementDetailData,
  buildExpectedMovementRowData,
  buildPostedMovementDetailData,
  buildPostedMovementRowData,
  buildScheduledMovementDetailData,
  buildScheduledMovementRowData,
  groupExpectedMovementsByDate,
} from './monthlyMovementPresentation';
import type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

export type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

function movementDetailActions(actions: Array<MovementDetailActionView | undefined>): MovementDetailActionView[] {
  return actions.filter((action): action is MovementDetailActionView => Boolean(action));
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

  const selectedExpectedCategoryName = selectedExpectedMovement
    ? resolveExpectedCategoryName(selectedExpectedMovement.categoryId)
    : undefined;
  const selectedScheduledCategoryName = selectedScheduledMovement
    ? resolveScheduledCategoryName(selectedScheduledMovement.categoryId)
    : undefined;
  const selectedScheduledTagNames = selectedScheduledMovement
    ? resolveScheduledTagNames(selectedScheduledMovement)
    : undefined;

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
        <MovementSectionView
          required={{
            config: {
              ariaLabel: 'Expected movements',
              title: 'Expected',
              toggleLabel: 'expected movements',
            },
            data: {
              count: expectedTotal,
              body: expectedGroups.map((group) => (
                <div key={group.key} className="stack">
                  <p className="hint date-group-label">{group.label}</p>
                  <ul className="expense-list expense-list--compact" aria-label={`Expected group ${group.label}`}>
                    {group.items.map((movement) => {
                      const expectedCategoryName = resolveExpectedCategoryName(movement.categoryId);
                      return (
                        <MovementRowView
                          key={movement.id}
                          required={{
                            config: {},
                            data: buildExpectedMovementRowData(movement, { categoryName: expectedCategoryName }),
                            state: {},
                            status: { disabled },
                          }}
                          provided={{ commands: { select: () => setSelectedExpectedMovement(movement) } }}
                        />
                      );
                    })}
                  </ul>
                </div>
              )),
            },
            state: {
              collapsible: expectedHasItems,
              expanded: expectedExpanded,
            },
            status: { disabled },
          }}
          provided={{ commands: { toggle: toggleExpectedExpanded } }}
        />
      ) : null}

      {!loading && showScheduledSection ? (
        <MovementSectionView
          required={{
            config: {
              ariaLabel: 'Scheduled movements',
              title: 'Scheduled',
              toggleLabel: 'scheduled movements',
            },
            data: {
              count: scheduledTotal,
              body: upcomingGroups.map((group) => (
                <div key={group.key} className="stack">
                  <p className="hint date-group-label">{group.label}</p>
                  <ul className="expense-list expense-list--compact" aria-label={`Scheduled group ${group.label}`}>
                    {group.items.map((movement) => {
                      const scheduledCategoryName = resolveScheduledCategoryName(movement.categoryId);
                      const scheduledTagNames = resolveScheduledTagNames(movement);
                      return (
                        <MovementRowView
                          key={movement.id}
                          required={{
                            config: {},
                            data: buildScheduledMovementRowData(movement, {
                              categoryName: scheduledCategoryName,
                              tagNames: scheduledTagNames,
                            }),
                            state: {},
                            status: { disabled },
                          }}
                          provided={{ commands: { select: () => setSelectedScheduledMovement(movement) } }}
                        />
                      );
                    })}
                  </ul>
                </div>
              )),
            },
            state: {
              collapsible: scheduledHasItems,
              expanded: scheduledExpanded,
            },
            status: { disabled },
          }}
          provided={{ commands: { toggle: toggleScheduledExpanded } }}
        />
      ) : null}

      {!loading ? (
        <MovementSectionView
          required={{
            config: {
              ariaLabel: 'Posted movements',
              title: 'Posted',
            },
            data: {
              count: pagination.totalElements,
              body: (
                <>
                  {postedGroups.length === 0 ? <p className="hint">No posted movements in {monthLabel}.</p> : null}
                  {postedGroups.map((group) => (
                    <div key={group.key} className="stack">
                      <p className="hint date-group-label">{group.label}</p>
                      <ul className="expense-list expense-list--compact" aria-label={`Posted group ${group.label}`}>
                        {group.items.map((transaction) => (
                          <MovementRowView
                            key={transaction.id}
                            required={{
                              config: {},
                              data: buildPostedMovementRowData(transaction),
                              state: {},
                              status: { disabled },
                            }}
                            provided={{ commands: { select: () => setSelectedTransaction(transaction) } }}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              ),
            },
            state: {
              collapsible: false,
              expanded: true,
            },
            status: { disabled },
          }}
          provided={{ commands: {} }}
        />
      ) : null}

      {selectedTransaction ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Transaction details',
              closeLabel: 'Close transaction details',
            },
            data: {
              ...buildPostedMovementDetailData(selectedTransaction),
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
              ...buildExpectedMovementDetailData(selectedExpectedMovement, {
                categoryName: selectedExpectedCategoryName,
              }),
              actions: [
                {
                  key: 'post',
                  label: 'Post movement',
                  onClick: () => {
                    void provided.commands.postExpectedMovement(
                      selectedExpectedMovement,
                      selectedExpectedCategoryName,
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
                      selectedExpectedCategoryName,
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
              ...buildScheduledMovementDetailData(selectedScheduledMovement, {
                categoryName: selectedScheduledCategoryName,
                tagNames: selectedScheduledTagNames,
              }),
              actions: movementDetailActions([
                selectedScheduledMovement.status === 'active' ? {
                  key: 'edit',
                  label: 'Edit movement',
                  variant: 'text',
                  onClick: () => {
                    provided.commands.editScheduledMovement(
                      selectedScheduledMovement,
                      selectedScheduledCategoryName,
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
