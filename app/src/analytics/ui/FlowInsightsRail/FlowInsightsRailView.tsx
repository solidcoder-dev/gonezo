import type { FlowInsightsRailViewProps, FlowInsightsRailItemView } from './FlowInsightsRailView.contract';
import styles from './FlowInsightsRailView.module.css';

function iconClassName(item: FlowInsightsRailItemView): string {
  if (item.tone === 'income') {
    return 'bi bi-arrow-up-right-circle';
  }
  if (item.tone === 'expense') {
    return 'bi bi-arrow-down-right-circle';
  }
  return 'bi bi-patch-question';
}

export function FlowInsightsRailView({ required }: FlowInsightsRailViewProps) {
  return (
    <section className={styles.section} aria-label="Flow insights" aria-busy={required.status.loading}>
      <header className={styles.header}>
        <h2>Flow insights</h2>
      </header>

      <div className={styles.rail}>
        {required.data.items.map((item) => (
          <article className={styles.card} key={item.key}>
            <span className={`${styles.icon} ${item.tone === 'expense' ? styles.expense : item.tone === 'income' ? styles.income : styles.neutral}`}>
              <i className={iconClassName(item)} aria-hidden />
            </span>
            <div className={styles.content}>
              <strong className={styles.title}>{item.title}</strong>
              <span className={styles.subtitle}>{item.subtitle}</span>
              <strong className={styles.amount}>{item.amount}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { FlowInsightsRailViewProps } from './FlowInsightsRailView.contract';
