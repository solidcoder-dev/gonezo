import { useMemo, useState } from 'react';
import type {
  MovementsSearchItemView,
  MovementsSearchModelProvided,
  MovementsSearchModelRequired,
} from '../domain/movementsView.types';
import { MovementDetailSheetView } from './MovementDetailSheetView';
import { MovementRowView } from './MovementRowView';
import {
  buildMovementSearchDetailData,
  buildMovementSearchRowData,
  groupMovementSearchResultsByDay,
} from './movementsSearchPresentation';

type MovementsSearchResultsProps = {
  required: Pick<MovementsSearchModelRequired, 'error' | 'state' | 'status'>;
  provided: Pick<MovementsSearchModelProvided, 'commands'>;
};

export function MovementsSearchResults({ required, provided }: MovementsSearchResultsProps) {
  const { appliedFilters, items, pagination } = required.state;
  const { loading, disabled } = required.status;
  const [selectedEntry, setSelectedEntry] = useState<MovementsSearchItemView | null>(null);

  const entries = useMemo(() => items, [items]);
  const groupedByDay = appliedFilters.sortField === 'date' && appliedFilters.groupByDay;
  const groups = useMemo(() => groupedByDay ? groupMovementSearchResultsByDay(entries) : [], [entries, groupedByDay]);
  const sortSummary = `${appliedFilters.sortField === 'date' ? 'Date' : 'Amount'} ${appliedFilters.sortDirection}`;
  const resultsLabel = `${pagination.totalElements} ${pagination.totalElements === 1 ? 'movement' : 'movements'}`;
  const summaryLabel = groupedByDay ? `${resultsLabel} · Grouped by day · ${sortSummary}` : `${resultsLabel} · ${sortSummary}`;

  return (
    <section className="stack" aria-label="Search results">
      {loading ? <p role="status">Loading movements...</p> : null}
      {!loading ? <p className="hint search-results-summary">{summaryLabel}</p> : null}
      {!loading && entries.length === 0 ? <p>No movements match these filters.</p> : null}

      {!loading && entries.length > 0 ? (
        <>
          {groupedByDay ? (
            <div className="stack">
              {groups.map((group) => (
                <div key={group.key} className="stack">
                  <p className="hint date-group-label">{group.label}</p>
                  <ul className="expense-list expense-list--compact" aria-label={`Movement results ${group.label}`}>
                    {group.items.map((entry) => (
                      <MovementRowView
                        key={`${entry.accountId ?? 'scope'}-${entry.source}-${entry.id}`}
                        required={{
                          config: {},
                          data: buildMovementSearchRowData(entry, { includeDate: false }),
                          state: {},
                          status: { disabled },
                        }}
                        provided={{ commands: { select: () => setSelectedEntry(entry) } }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="expense-list expense-list--compact" aria-label="Movement results">
              {entries.map((entry) => (
                <MovementRowView
                  key={`${entry.accountId ?? 'scope'}-${entry.source}-${entry.id}`}
                  required={{
                    config: {},
                    data: buildMovementSearchRowData(entry, { includeDate: true }),
                    state: {},
                    status: { disabled },
                  }}
                  provided={{ commands: { select: () => setSelectedEntry(entry) } }}
                />
              ))}
            </ul>
          )}

          {pagination.totalPages > 1 ? (
            <div className="quick-row">
              <button
                type="button"
                className="text-button"
                disabled={!pagination.hasPrevious || disabled}
                onClick={provided.commands.goToPreviousPage}
              >
                Previous
              </button>
              <span className="hint">
                Page {pagination.page + 1} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="text-button"
                disabled={!pagination.hasNext || disabled}
                onClick={provided.commands.goToNextPage}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {selectedEntry ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Movement details',
              closeLabel: 'Close movement details',
            },
            data: buildMovementSearchDetailData(selectedEntry),
            state: { open: true },
            status: { disabled },
          }}
          provided={{ commands: { close: () => setSelectedEntry(null) } }}
        />
      ) : null}
    </section>
  );
}
