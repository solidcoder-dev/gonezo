import { useMemo, useState } from 'react';
import type {
  MovementsSearchItemView,
  MovementsPaginationView,
  MovementsSearchFiltersState,
} from '../../application/movementsView.types';
import {
  MovementDetailSheetView,
  type MovementDetailActionView,
} from '../MovementDetailSheet/MovementDetailSheetView';
import { MovementRowView } from '../MovementRow/MovementRowView';
import {
  buildMovementSearchDetailData,
  buildMovementSearchRowData,
  groupMovementSearchResultsByDay,
} from './movementsSearchPresentation';
import '../movements.css';
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
  commands: {
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    voidPostedMovement: (transactionId: string) => Promise<void>;
  };
};

type MovementsSearchResultsProps = {
  required: MovementsSearchResultsRequired;
  provided: MovementsSearchResultsProvided;
};

function movementDetailActions(actions: Array<MovementDetailActionView | undefined>): MovementDetailActionView[] {
  return actions.filter((action): action is MovementDetailActionView => Boolean(action));
}

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
      {loading && entries.length === 0 ? <p role="status">Loading movements...</p> : null}
      {!loading || entries.length > 0 ? <p className="hint search-results-summary">{summaryLabel}</p> : null}
      {!loading && entries.length === 0 ? <p>No movements match these filters.</p> : null}

      {entries.length > 0 ? (
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

          {pagination.hasNext ? (
            <div className="quick-row">
              <button
                type="button"
                className="text-button"
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
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Movement details',
              closeLabel: 'Close movement details',
            },
            data: {
              ...buildMovementSearchDetailData(selectedEntry),
              actions: movementDetailActions([
                selectedEntry.source === 'posted' && selectedEntry.status === 'posted' ? {
                  key: 'void',
                  label: 'Void movement',
                  variant: 'danger',
                  onClick: () => {
                    void provided.commands.voidPostedMovement(selectedEntry.id).then(() => {
                      setSelectedEntry(null);
                    });
                  },
                } : undefined,
                {
                  key: 'close',
                  label: 'Close',
                  variant: 'text',
                  onClick: () => setSelectedEntry(null),
                },
              ]),
            },
            state: { open: true },
            status: { disabled },
          }}
          provided={{ commands: { close: () => setSelectedEntry(null) } }}
        />
      ) : null}
    </section>
  );
}
