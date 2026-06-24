import { HomeMovementListView } from '../../../shared/ui/HomeMovementList/HomeMovementListView';
import type { ExpectedMovementsCardViewProps } from './ExpectedMovementsCardView.contract';
import styles from './ExpectedMovementsCardView.module.css';

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
          <HomeMovementListView
            ariaLabel="Expected movements list"
            movements={movements}
            disabled={disabled}
            selectMovement={provided.commands.selectMovement}
          />
        </div>
      ) : null}
    </section>
  );
}

export type { ExpectedMovementsCardViewProps } from './ExpectedMovementsCardView.contract';
