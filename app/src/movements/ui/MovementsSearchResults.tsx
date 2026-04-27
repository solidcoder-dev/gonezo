import { useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { MovementsSearchItem } from '../../shared/domain/corePort';
import { formatCalendarDay } from '../../transactions/ui/postedGrouping';
import type { MovementsSearchModelProvided, MovementsSearchModelRequired } from '../application/useMovementsSearchModel';

type MovementsSearchResultsProps = {
  required: Pick<MovementsSearchModelRequired, 'error' | 'state' | 'status'>;
  provided: Pick<MovementsSearchModelProvided, 'commands'>;
};

function txSign(type: MovementsSearchItem['type']): string {
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

export function MovementsSearchResults({ required, provided }: MovementsSearchResultsProps) {
  const { items, pagination } = required.state;
  const { loading, disabled } = required.status;
  const [selectedEntry, setSelectedEntry] = useState<MovementsSearchItem | null>(null);

  const entries = useMemo(() => items, [items]);

  return (
    <section className="stack" aria-label="Search results">
      {loading ? <p role="status">Loading movements...</p> : null}
      {!loading && entries.length === 0 ? <p>No movements found.</p> : null}

      {!loading && entries.length > 0 ? (
        <>
          <ul className="expense-list expense-list--compact" aria-label="Movement results">
            {entries.map((entry) => (
              <li key={`${entry.source}-${entry.id}`} className="expense-item expense-item--compact">
                <button
                  type="button"
                  className="expense-item-button expense-item-button--compact"
                  onClick={() => setSelectedEntry(entry)}
                  disabled={disabled}
                >
                  <div className="expense-top-row compact-row">
                    <div className="tx-head compact-main">
                      <i
                        className={entry.type === 'income' || entry.type === 'transfer_in'
                          ? 'bi bi-arrow-up-right'
                          : entry.type === 'transfer' || entry.type === 'transfer_out'
                            ? 'bi bi-arrow-left-right'
                            : 'bi bi-arrow-down-right'}
                        aria-hidden
                      />
                      <strong className="compact-title">{entry.title}</strong>
                    </div>
                    <strong>
                      {txSign(entry.type)}
                      {txAmount(entry.amount, entry.currency)}
                    </strong>
                  </div>
                  <div className="expense-bottom-row compact-row">
                    <span className="hint compact-subline">
                      {[
                        formatCalendarDay(entry.occurredAt),
                        entry.category?.name,
                        compactTags(entry.tags),
                        entry.source === 'posted' ? 'Posted' : 'Scheduled',
                      ].filter((value): value is string => Boolean(value && value.trim().length > 0)).join(' · ')}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

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
        <div className="sheet-backdrop" role="presentation" onClick={() => setSelectedEntry(null)}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Movement details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="detail-sheet-header">
              <div className="detail-sheet-title">
                <span className="detail-sheet-kicker">
                  <i
                    className={selectedEntry.type === 'income' || selectedEntry.type === 'transfer_in'
                      ? 'bi bi-arrow-up-right'
                      : selectedEntry.type === 'transfer' || selectedEntry.type === 'transfer_out'
                        ? 'bi bi-arrow-left-right'
                        : 'bi bi-arrow-down-right'}
                    aria-hidden
                  />
                  <span>{selectedEntry.source === 'posted' ? 'Posted' : 'Scheduled'}</span>
                </span>
                <h3>{selectedEntry.title}</h3>
              </div>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close movement details"
                onClick={() => setSelectedEntry(null)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="detail-sheet-amount detail-sheet-amount--expense">
              {txSign(selectedEntry.type)}
              {txAmount(selectedEntry.amount, selectedEntry.currency)}
            </div>
            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Date</span>
                <strong>{formatCalendarDay(selectedEntry.occurredAt)}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Category</span>
                <strong>{selectedEntry.category?.name ?? 'No category'}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Tags</span>
                <strong>{compactTags(selectedEntry.tags) ?? 'No tags'}</strong>
              </div>
              <div className="detail-meta-item">
                <span className="hint detail-meta-label">Source</span>
                <strong>{selectedEntry.source}</strong>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
