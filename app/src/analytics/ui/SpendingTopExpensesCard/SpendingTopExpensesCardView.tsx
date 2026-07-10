import type { SpendingTopExpensesCardViewProps } from './SpendingTopExpensesCardView.contract';
import styles from './SpendingTopExpensesCardView.module.css';

export function SpendingTopExpensesCardView({ required }: SpendingTopExpensesCardViewProps) {
  return (
    <section className={styles.card} aria-label="Top expenses" aria-busy={required.status.loading}>
      <h2 className={styles.title}>Top expenses</h2>
      {required.status.loading ? (
        <div className={styles.skeleton} role="status" aria-label="Loading top expenses">
          {Array.from({ length: 3 }, (_, index) => <span className={styles.skeletonRow} key={index} />)}
        </div>
      ) : required.data.items.length === 0 ? (
        <p className={styles.empty}>No expenses found.</p>
      ) : (
        <div className={styles.list}>
          {required.data.items.map((item) => (
            <article className={styles.row} key={item.key}>
              <span className={styles.icon}>{item.title.slice(0, 1).toUpperCase()}</span>
              <strong className={styles.name}>{item.title}</strong>
              <strong className={styles.amount}>{item.amount}</strong>
              <span className={styles.date}>{item.occurredAtLabel}</span>
              <i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export type { SpendingTopExpensesCardViewProps } from './SpendingTopExpensesCardView.contract';
