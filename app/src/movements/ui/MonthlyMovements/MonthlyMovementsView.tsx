import { MonthNavigatorView } from '../MonthNavigator/MonthNavigatorView';
import { MonthPickerModalView } from '../MonthPickerModal/MonthPickerModalView';
import { MovementDetailView } from '../MovementDetail/MovementDetailView';
import { YearMonthSelectorView } from '../YearMonthSelector/YearMonthSelectorView';
import { MonthlyTimelineRowView } from './MonthlyTimelineRowView';
import '../movements.css';
import './MonthlyMovementsView.css';
import type { MonthlyMovementsMode, MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';
import type { MonthlyTimelineGroupViewModel } from '../../application/monthlyMovementsTimeline';

export type { MonthlyMovementsViewProps } from './MonthlyMovementsView.contract';

function TimelineSkeleton() {
  return (
    <div className="monthly-timeline-skeleton" aria-label="Loading movements">
      <span className="monthly-timeline-skeleton__date" />
      <span className="monthly-timeline-skeleton__row" />
      <span className="monthly-timeline-skeleton__row" />
    </div>
  );
}

function TimelineGroups({
  groups,
  disabled,
  onSelect,
}: {
  groups: MonthlyTimelineGroupViewModel[];
  disabled: boolean;
  onSelect: (source: MonthlyTimelineGroupViewModel['items'][number]['source'], id: string) => void;
}) {
  return (
    <div className="monthly-timeline-groups">
      {groups.map((group) => (
        <section key={group.dateKey} className="monthly-timeline-group" aria-label={group.dateLabel}>
          <h3 className="monthly-timeline-group__label">{group.dateLabel}</h3>
          <ul className="monthly-timeline-list">
            {group.items.map((item) => (
              <MonthlyTimelineRowView
                key={`${item.source}:${item.id}`}
                item={item}
                disabled={disabled}
                onSelect={() => onSelect(item.source, item.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function MonthlyMovementsView({ required, provided }: MonthlyMovementsViewProps) {
  const {
    monthLabel,
    isCurrentMonth,
    monthMenuOpen,
    monthPickerOpen,
    monthPickerYear,
    viewedMonthIndex,
    viewedYear,
    currentMonthIndex,
    currentYear,
    selectedMode,
    postedGroups,
    plannedGroups,
    expectedHasMore,
    scheduledHasMore,
    pagination,
  } = required.state;
  const { loading, disabled } = required.status;
  const activeGroups = selectedMode === 'posted' ? postedGroups : plannedGroups;
  const hasActiveItems = activeGroups.length > 0;
  const inactiveHasItems = selectedMode === 'posted' ? plannedGroups.length > 0 : postedGroups.length > 0;
  const plannedPreviewHasMore = expectedHasMore || scheduledHasMore;

  function selectTimelineItem(source: MonthlyTimelineGroupViewModel['items'][number]['source'], id: string) {
    if (source === 'posted') {
      provided.commands.openPostedMovementDetail(id);
    } else if (source === 'expected') {
      provided.commands.openExpectedMovementDetail(id);
    } else {
      provided.commands.openScheduledMovementDetail(id);
    }
  }

  function selectMode(mode: MonthlyMovementsMode) {
    provided.commands.selectMode(mode);
  }

  return (
    <section className="stack section-gap transactions-section" aria-busy={loading}>
      <MonthNavigatorView
        required={{ monthLabel, disabled, monthMenuOpen, isCurrentMonth }}
        provided={{
          onPreviousMonth: provided.commands.goToPreviousMonth,
          onNextMonth: provided.commands.goToNextMonth,
          onToggleMenu: provided.commands.toggleMonthMenu,
          onGoToCurrentMonth: provided.commands.goToCurrentMonth,
          onOpenMonthPicker: provided.commands.openMonthPicker,
        }}
      />

      <MonthPickerModalView required={{ open: monthPickerOpen }} provided={{ onDismiss: provided.commands.closeMonthPicker }}>
        <YearMonthSelectorView
          required={{ year: monthPickerYear, viewedYear, viewedMonthIndex, currentYear, currentMonthIndex, disabled }}
          provided={{
            onPreviousYear: provided.commands.goToPreviousPickerYear,
            onNextYear: provided.commands.goToNextPickerYear,
            onSelectMonth: provided.commands.selectPickerMonth,
          }}
        />
      </MonthPickerModalView>

      <div className="monthly-movements-tabs" role="tablist" aria-label="Movement timeline">
        {(['posted', 'planned'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            id={`monthly-movements-tab-${mode}`}
            aria-selected={selectedMode === mode}
            aria-controls={`monthly-movements-panel-${mode}`}
            tabIndex={selectedMode === mode ? 0 : -1}
            className="monthly-movements-tab"
            onClick={() => selectMode(mode)}
            disabled={disabled}
          >
            {mode === 'posted' ? 'Posted' : 'Planned'}
          </button>
        ))}
      </div>

      {loading ? <TimelineSkeleton /> : (
        <div
          id={`monthly-movements-panel-${selectedMode}`}
          role="tabpanel"
          aria-labelledby={`monthly-movements-tab-${selectedMode}`}
          className="monthly-movements-panel"
        >
          {!hasActiveItems ? (
            <div className="monthly-movements-empty">
              <p>
                {selectedMode === 'planned' && plannedPreviewHasMore
                  ? `No planned movements in ${monthLabel} in the current preview.`
                  : `No ${selectedMode === 'posted' ? 'posted' : 'planned'} movements in ${monthLabel}.`}
              </p>
              {inactiveHasItems ? (
                <button type="button" className="text-button" onClick={() => selectMode(selectedMode === 'posted' ? 'planned' : 'posted')}>
                  {selectedMode === 'posted' ? 'View Planned' : 'View Posted'}
                </button>
              ) : null}
            </div>
          ) : (
            <TimelineGroups groups={activeGroups} disabled={disabled} onSelect={selectTimelineItem} />
          )}

          {selectedMode === 'posted' && pagination.hasNext ? (
            <div className="monthly-timeline-load-more">
              <button type="button" className="text-button" disabled={disabled} onClick={provided.commands.goToNextPage}>
                Load more
              </button>
            </div>
          ) : null}
        </div>
      )}

      <MovementDetailView required={required.detail} provided={provided.detail} />
    </section>
  );
}
