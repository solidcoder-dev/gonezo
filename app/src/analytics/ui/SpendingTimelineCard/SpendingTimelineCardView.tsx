import type { SpendingTimelineCardViewProps } from './SpendingTimelineCardView.contract';
import styles from './SpendingTimelineCardView.module.css';

export function SpendingTimelineCardView({ required, provided }: SpendingTimelineCardViewProps) {
  const denseChart = required.data.points.length > 16;

  return (
    <section className={styles.card} aria-label="Spending over time" aria-busy={required.status.loading}>
      <div className={styles.header}>
        <h2 className={styles.title}>Spending over time</h2>
        <div className={styles.windowNav}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Previous spending window"
            disabled={required.status.disabled || required.status.loading || !required.state.canGoPreviousWindow}
            onClick={provided.commands.goToPreviousWindow}
          >
            <i className="bi bi-chevron-left" aria-hidden />
          </button>
          <span>{required.data.windowLabel}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Next spending window"
            disabled={required.status.disabled || required.status.loading || !required.state.canGoNextWindow}
            onClick={provided.commands.goToNextWindow}
          >
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
        </div>
      </div>
      {required.status.loading ? (
        <div className={styles.skeleton} role="status" aria-label="Loading spending timeline" />
      ) : required.data.points.length === 0 ? (
        <p className={styles.empty}>No timeline data.</p>
      ) : (
        <div
          className={denseChart ? styles.chartDense : styles.chart}
          style={{ gridTemplateColumns: `repeat(${required.data.points.length}, minmax(0, 1fr))` }}
        >
          {required.data.points.map((point, index) => (
            <div className={styles.point} key={point.key}>
              <span className={styles.barTrack}>
                <span className={styles.bar} style={{ height: `${Math.max(8, point.heightPercent)}%` }} />
              </span>
              <span className={shouldRenderPointLabel(index, required.data.points.length) ? styles.label : styles.labelMuted}>
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function shouldRenderPointLabel(index: number, pointCount: number): boolean {
  if (pointCount <= 12) {
    return true;
  }
  if (pointCount <= 16) {
    return index % 2 === 0 || index === pointCount - 1;
  }
  return index === 0 || index === pointCount - 1 || index % 5 === 0;
}

export type { SpendingTimelineCardViewProps } from './SpendingTimelineCardView.contract';
