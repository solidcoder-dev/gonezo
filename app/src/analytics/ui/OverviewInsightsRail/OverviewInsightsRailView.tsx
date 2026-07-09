import type { OverviewInsightsRailItemView, OverviewInsightsRailViewProps } from './OverviewInsightsRailView.contract';
import styles from './OverviewInsightsRailView.module.css';

export function OverviewInsightsRailView({ required }: OverviewInsightsRailViewProps) {
  return (
    <section className={styles.section} aria-label="Overview insights" aria-busy={required.status.loading}>
      <header className={styles.header}>
        <h2>More insights</h2>
      </header>

      {required.status.loading ? (
        <div className={styles.skeletonRail} role="status" aria-label="Loading overview insights">
          {Array.from({ length: 4 }, (_, index) => (
            <span className={styles.skeletonCard} key={index} />
          ))}
        </div>
      ) : required.data.items.length > 0 ? (
        <div className={styles.rail}>
          {required.data.items.map((item) => (
            <InsightCard item={item} key={item.key} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState} role="note" aria-label="No overview insights">
          <strong>No insight cards configured</strong>
          <span>Overview insights are unavailable right now.</span>
        </div>
      )}
    </section>
  );
}

function InsightCard({ item }: { item: OverviewInsightsRailItemView }) {
  const iconClassName = item.tone === 'expense'
    ? styles.iconExpense
    : item.tone === 'transfer'
      ? styles.iconTransfer
      : styles.iconPositive;

  return (
    <article className={styles.card}>
      <span className={iconClassName}>
        <i className={item.iconClassName} aria-hidden />
      </span>
      <div className={styles.content}>
        <strong className={styles.title}>{item.title}</strong>
        <span className={styles.subtitle}>{item.subtitle}</span>
        <strong className={styles.amount}>{item.amount}</strong>
      </div>
    </article>
  );
}

export type { OverviewInsightsRailViewProps } from './OverviewInsightsRailView.contract';
