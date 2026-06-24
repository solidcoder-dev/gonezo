import { HomeMovementListView, type HomeMovementRowView } from '../../../shared/ui/HomeMovementList/HomeMovementListView';
import styles from './HomeRecentMovementsView.module.css';

export type HomeRecentMovementRowView = HomeMovementRowView;

export type HomeRecentMovementsViewProps = {
  required: {
    data: {
      movements: HomeRecentMovementRowView[];
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      selectMovement: (movementId: string) => void;
      seeAll: () => void;
    };
  };
};

export function HomeRecentMovementsView({ required, provided }: HomeRecentMovementsViewProps) {
  const { movements } = required.data;
  const { loading, disabled } = required.status;

  return (
    <section className={styles.section} aria-label="Recent movements" aria-busy={loading}>
      <div className={styles.header}>
        <h2>Recent movements</h2>
        <button type="button" className={styles.seeAllButton} onClick={provided.commands.seeAll}>
          See all
        </button>
      </div>

      {loading ? <div className={styles.skeleton} role="status" aria-label="Loading recent movements" /> : null}

      {!loading && movements.length === 0 ? <p className={styles.empty}>No recent movements.</p> : null}

      {!loading && movements.length > 0 ? (
        <HomeMovementListView
          ariaLabel="Recent movements list"
          movements={movements}
          disabled={disabled}
          selectMovement={provided.commands.selectMovement}
        />
      ) : null}
    </section>
  );
}
