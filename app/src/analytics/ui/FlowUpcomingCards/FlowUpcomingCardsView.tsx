import type { FlowUpcomingCardsViewProps } from './FlowUpcomingCardsView.contract';
import styles from './FlowUpcomingCardsView.module.css';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

function renderCard(
  title: string,
  totalAmount: string,
  items: FlowUpcomingCardsViewProps['required']['data']['incoming'],
  tone: 'income' | 'expense',
) {
  const hasItems = items.length > 0;
  return (
    <article className={`${styles.card} ${tone === 'expense' ? styles.expense : styles.income}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          <strong>{totalAmount}</strong>
        </div>
      </div>
      <ul className={styles.items}>
        {hasItems ? items.map((item) => (
          <li key={item.movementId} className={styles.item}>
            <span className={styles.itemTitle}>{item.title}</span>
            <span className={styles.itemAmount}>{item.amount}</span>
            <span className={styles.itemDate}>{formatDate(item.occurredAt)}</span>
          </li>
        )) : <li className={styles.empty}>No scheduled movements</li>}
      </ul>
    </article>
  );
}

export function FlowUpcomingCardsView({ required }: FlowUpcomingCardsViewProps) {
  return (
    <section className={styles.section} aria-label="Upcoming money" aria-busy={required.status.loading}>
      <div className={styles.grid}>
        {renderCard('Upcoming money in', required.data.incomingTotalAmount, required.data.incoming, 'income')}
        {renderCard('Upcoming money out', required.data.outgoingTotalAmount, required.data.outgoing, 'expense')}
      </div>
    </section>
  );
}

export type { FlowUpcomingCardsViewProps } from './FlowUpcomingCardsView.contract';
