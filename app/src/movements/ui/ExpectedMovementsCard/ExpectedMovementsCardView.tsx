import { MovementRowView } from '../MovementRow/MovementRowView';
import type { ExpectedMovementsCardViewProps } from './ExpectedMovementsCardView.contract';
import styles from './ExpectedMovementsCardView.module.css';
import '../movements.css';

export function ExpectedMovementsCardView({ required, provided }: ExpectedMovementsCardViewProps) {
  const { movements } = required.data;
  const { loading, disabled } = required.status;

  return (
    <section className={styles.card} aria-label="Expected movements" aria-busy={loading}>
      <div className={styles.header}>
        <h2>Expected movements</h2>
        <span className={styles.count}>{movements.length}</span>
      </div>

      {loading ? <p className={styles.empty} role="status">Loading expected movements...</p> : null}

      {!loading && movements.length === 0 ? <p className={styles.empty}>No expected movements.</p> : null}

      {!loading && movements.length > 0 ? (
        <div className={styles.list}>
          <ul className="expense-list expense-list--compact" aria-label="Expected movements list">
            {movements.map((movement) => (
              <MovementRowView
                key={movement.id}
                required={{
                  config: {},
                  data: movement.row,
                  state: {},
                  status: { disabled },
                }}
                provided={{ commands: { select: () => provided.commands.selectMovement(movement.id) } }}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export type { ExpectedMovementsCardViewProps } from './ExpectedMovementsCardView.contract';
