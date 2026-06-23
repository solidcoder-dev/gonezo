import type { CashFlowSummaryCardsViewProps } from './CashFlowSummaryCardsView.contract';
import styles from './CashFlowSummaryCardsView.module.css';

export function CashFlowSummaryCardsView({ required }: CashFlowSummaryCardsViewProps) {
  return (
    <section className={styles.grid} aria-label="Cash flow summary" aria-busy={required.status.loading}>
      {required.data.cards.map((card) => (
        <article className={`${styles.card} ${required.status.loading ? styles.loading : ''}`} key={card.key}>
          <span className={`${styles.icon} ${card.tone === 'expense' ? styles.iconExpense : ''}`}>
            <i className={card.iconClassName} aria-hidden />
          </span>
          <span className={styles.content}>
            <span className={styles.label}>{card.label}</span>
            <strong className={styles.amount}>{card.amount}</strong>
          </span>
        </article>
      ))}
    </section>
  );
}

export type { CashFlowSummaryCardsViewProps } from './CashFlowSummaryCardsView.contract';
