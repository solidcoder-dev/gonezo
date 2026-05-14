import { useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { formatCalendarDay } from '../../transactions/ui/postedGrouping';
import type {
  MovementsSearchItemView,
  MovementsSearchModelProvided,
  MovementsSearchModelRequired,
} from '../domain/movementsView.types';
import { MovementDetailSheetView } from './MovementDetailSheetView';

type MovementsSearchResultsProps = {
  required: Pick<MovementsSearchModelRequired, 'error' | 'state' | 'status'>;
  provided: Pick<MovementsSearchModelProvided, 'commands'>;
};

function txSign(type: MovementsSearchItemView['type']): string {
  if (type === 'income' || type === 'transfer_in') return '+';
  if (type === 'expense' || type === 'transfer_out') return '-';
  return '';
}

function txAmount(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
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

function txKind(type: MovementsSearchItemView['type']): 'income' | 'expense' | 'transfer' {
  if (type === 'income') return 'income';
  if (type === 'transfer') return 'transfer';
  return 'expense';
}

function movementTypeLabel(type: MovementsSearchItemView['type']): string {
  if (type === 'income') return 'Income';
  if (type === 'transfer') return 'Transfer';
  return 'Expense';
}

function movementIconClass(type: MovementsSearchItemView['type']): string {
  const kind = txKind(type);
  if (kind === 'income') return 'bi bi-arrow-up-right';
  if (kind === 'transfer') return 'bi bi-arrow-left-right';
  return 'bi bi-arrow-down-right';
}

function sourceLabel(source: MovementsSearchItemView['source']): string {
  if (source === 'posted') return 'Posted';
  if (source === 'scheduled') return 'Scheduled';
  return 'Expected';
}

function groupDateLabel(isoDateTime: string, now = new Date()): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }

  const sameYear = parsed.getFullYear() === now.getFullYear();
  const datePart = new Intl.DateTimeFormat(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed).toUpperCase();
  const relative = formatCalendarDay(isoDateTime, now);
  if (relative === 'Today' || relative === 'Yesterday') {
    return `${datePart} · ${relative.toUpperCase()}`;
  }
  return datePart;
}

function groupKey(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }
  return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
}

function groupEntriesByDay(
  entries: MovementsSearchItemView[],
): Array<{ key: string; label: string; items: MovementsSearchItemView[] }> {
  const groups: Array<{ key: string; label: string; items: MovementsSearchItemView[] }> = [];
  const groupIndexByKey = new Map<string, number>();

  for (const entry of entries) {
    const key = groupKey(entry.occurredAt);
    const knownIndex = groupIndexByKey.get(key);
    if (knownIndex == null) {
      groups.push({ key, label: groupDateLabel(entry.occurredAt), items: [entry] });
      groupIndexByKey.set(key, groups.length - 1);
      continue;
    }
    groups[knownIndex].items.push(entry);
  }

  return groups;
}

type ResultMetaPart = {
  key: string;
  value: string;
  primary?: boolean;
};

function resultMetaParts(entry: MovementsSearchItemView, includeDate: boolean): ResultMetaPart[] {
  const tags = compactTags(entry.tags);
  return [
    entry.accountName ? { key: 'account', value: entry.accountName, primary: true } : undefined,
    includeDate ? { key: 'date', value: formatCalendarDay(entry.occurredAt) } : undefined,
    entry.category?.name ? { key: 'category', value: entry.category.name } : undefined,
    tags ? { key: 'tags', value: tags } : undefined,
  ].filter((part): part is ResultMetaPart => Boolean(part && part.value.trim().length > 0));
}

function ResultMeta({ entry, includeDate }: { entry: MovementsSearchItemView; includeDate: boolean }) {
  const parts = resultMetaParts(entry, includeDate);
  return (
    <span className="hint compact-subline">
      {parts.map((part, index) => (
        <span key={part.key} className="compact-meta-part">
          {index > 0 ? <span className="compact-meta-separator"> · </span> : null}
          {part.primary ? <strong className="compact-account-name">{part.value}</strong> : part.value}
        </span>
      ))}
    </span>
  );
}

function ResultRow({
  entry,
  disabled,
  includeDate,
  onSelect,
}: {
  entry: MovementsSearchItemView;
  disabled: boolean;
  includeDate: boolean;
  onSelect: (entry: MovementsSearchItemView) => void;
}) {
  const kind = txKind(entry.type);

  return (
    <li className={`expense-item expense-item--compact expense-item--${kind}`}>
      <button
        type="button"
        className="expense-item-button expense-item-button--compact"
        onClick={() => onSelect(entry)}
        disabled={disabled}
      >
        <div className="expense-top-row compact-row">
          <div className="tx-head compact-main">
            <i className={movementIconClass(entry.type)} aria-hidden />
            <strong className="compact-title">{entry.title}</strong>
          </div>
          <strong className={`movement-amount movement-amount--${kind}`}>
            {txSign(entry.type)}
            {txAmount(entry.amount, entry.currency)}
          </strong>
        </div>
        <div className="expense-bottom-row compact-row">
          <ResultMeta entry={entry} includeDate={includeDate} />
        </div>
      </button>
    </li>
  );
}

export function MovementsSearchResults({ required, provided }: MovementsSearchResultsProps) {
  const { appliedFilters, items, pagination } = required.state;
  const { loading, disabled } = required.status;
  const [selectedEntry, setSelectedEntry] = useState<MovementsSearchItemView | null>(null);

  const entries = useMemo(() => items, [items]);
  const groupedByDay = appliedFilters.sortField === 'date' && appliedFilters.groupByDay;
  const groups = useMemo(() => groupedByDay ? groupEntriesByDay(entries) : [], [entries, groupedByDay]);
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
                      <ResultRow
                        key={`${entry.accountId ?? 'scope'}-${entry.source}-${entry.id}`}
                        entry={entry}
                        disabled={disabled}
                        includeDate={false}
                        onSelect={setSelectedEntry}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="expense-list expense-list--compact" aria-label="Movement results">
              {entries.map((entry) => (
                <ResultRow
                  key={`${entry.accountId ?? 'scope'}-${entry.source}-${entry.id}`}
                  entry={entry}
                  disabled={disabled}
                  includeDate
                  onSelect={setSelectedEntry}
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
            data: {
              title: selectedEntry.title,
              kicker: `${movementTypeLabel(selectedEntry.type)} · ${sourceLabel(selectedEntry.source)}`,
              iconClassName: movementIconClass(selectedEntry.type),
              amount: {
                kind: txKind(selectedEntry.type),
                sign: txSign(selectedEntry.type),
                value: selectedEntry.amount,
                currency: selectedEntry.currency,
              },
              meta: [
                selectedEntry.accountName ? { label: 'Account', value: selectedEntry.accountName } : undefined,
                { label: 'Date', value: formatCalendarDay(selectedEntry.occurredAt) },
                { label: 'Category', value: selectedEntry.category?.name ?? 'No category' },
                { label: 'Tags', value: compactTags(selectedEntry.tags) ?? 'No tags' },
                { label: 'Source', value: selectedEntry.source },
              ].filter((item): item is { label: string; value: string } => Boolean(item)),
              splitItems: selectedEntry.items,
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
