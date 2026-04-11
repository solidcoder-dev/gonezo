import type { RecurrenceMovementItem } from '../../shared/domain/corePort';

type Props = {
  loading: boolean;
  error: string;
  items: RecurrenceMovementItem[];
  deactivatingId: string;
  onDeactivate: (recurringMovementId: string) => Promise<void>;
};

function formatDate(value?: string): string {
  if (!value) {
    return 'No next due';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

export function RecurringMovementsView({
  loading,
  error,
  items,
  deactivatingId,
  onDeactivate,
}: Props) {
  return (
    <section className="card nested-card">
      <div className="inline-header">
        <h3>Recurring</h3>
        {loading ? <span className="hint">Loading…</span> : null}
      </div>
      {error ? <div className="banner error" role="alert">{error}</div> : null}

      {items.length === 0 ? (
        <p className="hint">No recurring movements.</p>
      ) : (
        <ul className="expense-list" aria-label="Recurring movements">
          {items.map((item) => (
            <li key={item.id} className="expense-item">
              <div className="inline-header">
                <strong>{item.description ?? item.type}</strong>
                <span>{item.amount} {item.currency}</span>
              </div>
              <div className="inline-header">
                <span className="hint">Next: {formatDate(item.nextDueAt)}</span>
                <span className="hint">Status: {item.status}</span>
              </div>
              {item.status === 'active' ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void onDeactivate(item.id)}
                  disabled={deactivatingId === item.id}
                >
                  {deactivatingId === item.id ? 'Deactivating…' : 'Deactivate'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
