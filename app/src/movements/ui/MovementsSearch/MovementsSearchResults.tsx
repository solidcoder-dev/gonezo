import { useMemo, useState } from 'react';
import type {
  MovementsSearchItemView,
  MovementsPaginationView,
  MovementsSearchFiltersState,
} from '../../application/movementsView.types';
import type { MovementsSearchPagePort } from '../../application/movementsSearch.port';
import type { ExpectedMovementView } from '../../application/movementsView.types';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import { MovementDetailOverlayComponent } from '../../application/MovementDetailOverlayComponent';
import { MovementTimelineRowView } from '../../../shared/ui/MovementTimelineRowView';
import {
  buildMovementSearchTimelineGroups,
  buildMovementSearchTimelineItem,
  groupMovementSearchResultsByDay,
} from './movementsSearchPresentation';
import '../movements.css';
import '../MonthlyMovements/MonthlyMovementsView.css';
import './MovementsSearch.css';

export type MovementsSearchResultsRequired = {
  state: {
    appliedFilters: MovementsSearchFiltersState;
    items: MovementsSearchItemView[];
    pagination: MovementsPaginationView;
  };
  status: {
    loading: boolean;
    disabled: boolean;
  };
};

export type MovementsSearchResultsProvided = {
  context: {
    core: MovementsSearchPagePort;
  };
  commands: {
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    refreshResults: () => Promise<void>;
    voidPostedMovement: (transactionId: string) => Promise<void>;
  };
  events: {
    onPostExpectedMovement: (movement: ExpectedMovementView, categoryName?: string) => void;
    onEditExpectedMovement: (movement: ExpectedMovementView, categoryName?: string) => void;
    onDuplicateMovement?: (movement: MovementDetailViewModel) => void;
  };
};

type MovementsSearchResultsProps = {
  required: MovementsSearchResultsRequired;
  provided: MovementsSearchResultsProvided;
};

export function MovementsSearchResults({ required, provided }: MovementsSearchResultsProps) {
  const { appliedFilters, items, pagination } = required.state;
  const { loading, disabled } = required.status;
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);

  const entries = useMemo(() => items, [items]);
  const selectedEntry = useMemo(
    () => selectedEntryKey
      ? entries.find((entry) => `${entry.source}:${entry.id}` === selectedEntryKey) ?? null
      : null,
    [entries, selectedEntryKey],
  );
  const groupedByDay = appliedFilters.sortField === 'date' && appliedFilters.groupByDay;
  const groups = useMemo(() => groupedByDay
    ? buildMovementSearchTimelineGroups(groupMovementSearchResultsByDay(entries))
    : [], [entries, groupedByDay]);
  const sortSummary = `${appliedFilters.sortField === 'date' ? 'Date' : 'Amount'} ${appliedFilters.sortDirection}`;
  const resultsLabel = `${pagination.totalElements} ${pagination.totalElements === 1 ? 'movement' : 'movements'}`;
  const summaryLabel = groupedByDay ? `${resultsLabel} · Grouped by day · ${sortSummary}` : `${resultsLabel} · ${sortSummary}`;

  return (
    <section className="vstack gap-2" aria-label="Search results">
      {loading && entries.length === 0 ? <p role="status">Loading movements...</p> : null}
      {!loading || entries.length > 0 ? <p className="gz-hint search-results-summary">{summaryLabel}</p> : null}
      {!loading && entries.length === 0 ? <p>No movements match these filters.</p> : null}

      {entries.length > 0 ? (
        <>
          {groupedByDay ? (
            <div className="monthly-timeline-groups">
              {groups.map((group) => (
                <section key={group.dateKey} className="monthly-timeline-group" aria-label={group.dateLabel}>
                  <h3 className="monthly-timeline-group__label">{group.dateLabel}</h3>
                  <ul className="monthly-timeline-list" aria-label={`Movement results ${group.dateLabel}`}>
                    {group.items.map((item) => (
                      <MovementTimelineRowView
                        key={`${item.source}-${item.id}`}
                        item={item}
                        disabled={disabled}
                        onSelect={() => setSelectedEntryKey(`${item.source}:${item.id}`)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <ul className="monthly-timeline-list" aria-label="Movement results">
              {entries.map((entry) => (
                <MovementTimelineRowView
                  key={`${entry.source}-${entry.id}`}
                  item={buildMovementSearchTimelineItem(entry, { includeDate: true })}
                  disabled={disabled}
                  onSelect={() => setSelectedEntryKey(`${entry.source}:${entry.id}`)}
                />
              ))}
            </ul>
          )}

          {pagination.hasNext ? (
            <div className="gz-quick-row">
              <button
                type="button"
                className="gz-text-button"
                disabled={disabled}
                onClick={provided.commands.goToNextPage}
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {selectedEntry ? (
        <MovementDetailOverlayComponent
          required={{
            context: {
              core: provided.context.core,
            },
            data: {
              selection: { source: selectedEntry.source, id: selectedEntry.id },
            },
          }}
          provided={{
            commands: {
              refreshMovements: provided.commands.refreshResults,
              voidPostedMovement: provided.commands.voidPostedMovement,
            },
            events: {
              onClose: () => setSelectedEntryKey(null),
              onPostExpectedMovement: provided.events.onPostExpectedMovement,
              onEditExpectedMovement: provided.events.onEditExpectedMovement,
              onDuplicateMovement: provided.events.onDuplicateMovement,
            },
          }}
        />
      ) : null}
    </section>
  );
}
