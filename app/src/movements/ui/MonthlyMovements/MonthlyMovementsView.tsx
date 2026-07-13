import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { groupPostedTransactionsByDate } from './postedGrouping';
import { groupScheduledMovementsByDate } from './scheduledGrouping';
import { MonthNavigatorView } from '../MonthNavigator/MonthNavigatorView';
import { MonthPickerModalView } from '../MonthPickerModal/MonthPickerModalView';
import { MovementDetailView } from '../MovementDetail/MovementDetailView';
import { MovementRowView } from '../MovementRow/MovementRowView';
import { MovementSectionView } from '../MovementSection/MovementSectionView';
import { YearMonthSelectorView } from '../YearMonthSelector/YearMonthSelectorView';
import {
  buildExpectedMovementRowData,
  buildPostedMovementRowData,
  buildScheduledMovementRowData,
  groupExpectedMovementsByDate,
} from './monthlyMovementPresentation';
import '../movements.css';
import './MonthlyMovementsView.css';
import type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';
import type { ScheduledMovementView } from '../../application/movementsView.types';

export type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

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
  } = required.state;
  const { loading, disabled } = required.status;
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
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0);
    if (namesFromMovement.length > 0) {
      return namesFromMovement;
    }
    return (movement.tagIds ?? [])
      .map((tagId: string) => tagLabelById.get(tagId))
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
                          provided={{ commands: { select: () => provided.commands.openExpectedMovementDetail(movement.id) } }}
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
                          provided={{ commands: { select: () => provided.commands.openScheduledMovementDetail(movement.id) } }}
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
                            provided={{ commands: { select: () => provided.commands.openPostedMovementDetail(transaction.id) } }}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                  {pagination.hasNext ? (
                    <div className="quick-row">
                      <button
                        type="button"
                        className="text-button"
                        disabled={disabled}
                        onClick={provided.commands.goToNextPage}
                      >
                        Load more
                      </button>
                    </div>
                  ) : null}
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

      <MovementDetailView required={required.detail} provided={provided.detail} />

    </section>
  );
}
