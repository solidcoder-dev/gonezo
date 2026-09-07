import { MovementTimelineRowView } from '../../../shared/ui/MovementTimelineRowView';
import type { MonthlyTimelineGroupViewModel } from '../../../movements/application/monthlyMovementsTimeline';
import styles from './HomeRecentMovementsView.module.css';
import { formatHomeMovementDate } from './formatHomeMovementDate';

export type HomeMovementMetadata = {
  itemCount: number;
  shareCount: number;
};

export type HomeRecentMovementsViewProps = {
  required: {
    data: {
      groups: MonthlyTimelineGroupViewModel[];
      movementMetadataById: Record<string, HomeMovementMetadata>;
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
  const { groups, movementMetadataById } = required.data;
  const { loading, disabled } = required.status;
  const movements = groups.flatMap((group) => group.items);

  return (
    <section className={styles.section} aria-label="Recent movements" aria-busy={loading}>
      <div className={`${styles.header} d-flex align-items-center justify-content-between gap-2`}>
        <h2 className={`${styles.sectionLabel} text-uppercase m-0`}>Recent movements</h2>
        <button type="button" className={`${styles.seeAllButton} d-inline-flex align-items-center gap-1`} onClick={provided.commands.seeAll}>
          See all <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>

      {loading ? (
        <div className={styles.skeleton} role="status" aria-label="Loading recent movements">
          <span className={styles.skeletonRow} />
          <span className={styles.skeletonRow} />
        </div>
      ) : null}

      {!loading && movements.length === 0 ? <p className={styles.empty}>No recent movements.</p> : null}

      {!loading && movements.length > 0 ? (
        <ul className={`${styles.list} d-grid gap-2`} aria-label="Recent movements list">
          {movements.map((item) => {
            const metadata = movementMetadataById[item.id];
            return (
              <MovementTimelineRowView
                key={`${item.source}:${item.id}`}
                item={item}
                disabled={disabled ?? false}
                onSelect={() => provided.commands.selectMovement(item.id)}
                variant="home"
                trailingMetadata={formatHomeMovementDate(item.occurredOn, new Date())}
                metadataCounters={{
                  itemCount: metadata?.itemCount ?? 0,
                  shareCount: metadata?.shareCount ?? 0,
                }}
              />
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
