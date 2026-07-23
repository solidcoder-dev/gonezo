import { MonthlyTimelineRowView } from '../../../movements/ui/MonthlyMovements/MonthlyTimelineRowView';
import type { MonthlyTimelineGroupViewModel } from '../../../movements/application/monthlyMovementsTimeline';
import '../../../movements/ui/MonthlyMovements/MonthlyMovementsView.css';
import styles from './HomeRecentMovementsView.module.css';

export type HomeRecentMovementsViewProps = {
  required: {
    data: {
      groups: MonthlyTimelineGroupViewModel[];
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
  const { groups } = required.data;
  const { loading, disabled } = required.status;
  const movements = groups.flatMap((group) => group.items);

  return (
    <section className={styles.section} aria-label="Recent movements" aria-busy={loading}>
      <div className={styles.header}>
        <h2>Recent movements</h2>
        <button type="button" className={styles.seeAllButton} onClick={provided.commands.seeAll}>
          See all
        </button>
      </div>

      {loading ? (
        <div className="monthly-timeline-skeleton" role="status" aria-label="Loading recent movements">
          <span className="monthly-timeline-skeleton__row" />
          <span className="monthly-timeline-skeleton__row" />
        </div>
      ) : null}

      {!loading && movements.length === 0 ? <p className={styles.empty}>No recent movements.</p> : null}

      {!loading && movements.length > 0 ? (
        <ul className="monthly-timeline-list" aria-label="Recent movements list">
          {movements.map((item) => (
            <MonthlyTimelineRowView
              key={`${item.source}:${item.id}`}
              item={item}
              disabled={disabled ?? false}
              onSelect={() => provided.commands.selectMovement(item.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
