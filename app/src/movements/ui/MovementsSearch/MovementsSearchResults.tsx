import { useMemo, useState } from 'react';
import type {
  MovementsSearchItemView,
  MovementsPaginationView,
  MovementsSearchFiltersState,
} from '../../application/movementsView.types';
import type { MovementsSearchPagePort } from '../../application/movementsSearch.port';
import type { ExpectedMovementView } from '../../application/movementsView.types';
import { MovementDetailOverlayComponent } from '../../application/MovementDetailOverlayComponent';
import { MonthlyTimelineRowView } from '../MonthlyMovements/MonthlyTimelineRowView';
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
    <section className="stack" aria-label="Search results">
      {loading && entries.length === 0 ? <p role="status">Loading movements...</p> : null}
      {!loading || entries.length > 0 ? <p className="hint search-results-summary">{summaryLabel}</p> : null}
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
                      <MonthlyTimelineRowView
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
                <MonthlyTimelineRowView
                  key={`${entry.source}-${entry.id}`}
                  item={buildMovementSearchTimelineItem(entry, { includeDate: true })}
                  disabled={disabled}
                  onSelect={() => setSelectedEntryKey(`${entry.source}:${entry.id}`)}
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
        <MovementDetailOverlayComponent
          required={{
            context: {
              core: provided.context.core,
            },
            data: {
              selection: { source: selectedEntry.source, id: selectedEntry.id },
              postedItems: entries
                .filter((entry): entry is MovementsSearchItemView & { source: 'posted' } => entry.source === 'posted')
                .map((entry) => ({
                  id: entry.id,
                  accountId: entry.accountId ?? '',
                  accountName: entry.accountName,
                  occurredAt: entry.occurredAt,
                  description: entry.description,
                  merchant: entry.merchant || entry.title,
                  amount: entry.amount,
                  currency: entry.currency,
                  type: entry.type,
                  status: entry.status === 'voided' ? 'voided' : 'posted',
                  categoryId: entry.categoryId,
                  category: entry.category,
                  tags: entry.tags,
                  ignored: entry.ignored,
                  items: entry.items ?? [],
                })),
              scheduledItems: entries
                .filter((entry): entry is MovementsSearchItemView & { source: 'scheduled' } => entry.source === 'scheduled')
                .map((entry) => ({
                  id: entry.id,
                  type: entry.type === 'income' || entry.type === 'transfer' ? entry.type : 'expense',
                  sourceAccountId: entry.accountId ?? '',
                  accountName: entry.accountName,
                  amount: entry.amount,
                  currency: entry.currency,
                  description: entry.description,
                  merchant: entry.merchant || entry.title,
                  status: entry.status === 'deactivated' ? 'deactivated' : entry.status === 'failed' ? 'completed' : 'active',
                  startAt: entry.occurredAt,
                  nextDueAt: entry.occurredAt,
                  zoneId: 'UTC',
                  generatedOccurrences: 0,
                  splitItems: entry.items ?? [],
                  rule: { frequency: 'monthly', interval: 1 },
                  recurrenceEnd: { kind: 'never' },
                  categoryId: entry.categoryId ?? entry.category?.id,
                  tagIds: entry.tags?.map((tag) => tag.id).filter((tagId): tagId is string => typeof tagId === 'string'),
                  tagNames: entry.tags?.map((tag) => tag.name),
                })),
              expectedItems: entries
                .filter((entry): entry is MovementsSearchItemView & { source: 'expected' } => entry.source === 'expected')
                .map((entry) => ({
                  id: entry.id,
                  accountId: entry.accountId ?? '',
                  accountName: entry.accountName,
                  type: entry.type === 'income' ? 'income' : 'expense',
                  amount: entry.amount,
                  currency: entry.currency,
                  expectedAt: entry.occurredAt,
                  description: entry.description,
                  merchant: entry.merchant || entry.title,
                  categoryId: entry.categoryId ?? entry.category?.id,
                  splitItems: entry.items ?? [],
                  status: entry.status === 'resolved' || entry.status === 'dismissed' ? entry.status : 'pending',
                  createdAt: entry.occurredAt,
                  updatedAt: entry.occurredAt,
                  ignored: entry.ignored,
                  origin: { kind: 'manual' },
                })),
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
            },
          }}
        />
      ) : null}
    </section>
  );
}
