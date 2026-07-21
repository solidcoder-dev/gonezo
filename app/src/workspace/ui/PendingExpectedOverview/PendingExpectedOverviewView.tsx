import type { ViewProps } from '../../../shared/ui/ViewProps';
import styles from './PendingExpectedOverviewView.module.css';

export type PendingExpectedCardView = {
  title: string;
  count: number;
  primaryAmount: string;
  secondaryAmount?: string;
  moreCurrenciesLabel?: string;
  tone: 'expense' | 'income';
  disabled: boolean;
  accessibleLabel: string;
};

export type PendingExpectedOverviewViewProps = ViewProps<
  Record<string, never>,
  { cards: [PendingExpectedCardView, PendingExpectedCardView] },
  Record<string, never>,
  { loading: boolean; error?: string },
  { selectExpense: () => void; selectIncome: () => void }
>;

export function PendingExpectedOverviewView({ required, provided }: PendingExpectedOverviewViewProps) {
  if (required.status.loading) {
    return <section className={styles.section} aria-label="Expected movements" aria-busy="true"><div className={styles.heading}><h2>Expected movements</h2></div><div className={styles.cards}><div className={styles.skeleton} /><div className={styles.skeleton} /></div></section>;
  }

  return (
    <section className={styles.section} aria-label="Expected movements" aria-busy="false">
      <div className={styles.heading}><h2>Expected movements</h2></div>
      {required.status.error ? <p role="alert">{required.status.error}</p> : null}
      <div className={styles.cards}>
        {required.data.cards.map((card, index) => (
          <button
            key={card.title}
            type="button"
            className={`${styles.card} ${styles[card.tone]} ${card.disabled ? styles.disabled : ''}`}
            disabled={card.disabled}
            aria-label={card.accessibleLabel}
            onClick={index === 0 ? provided.commands.selectExpense : provided.commands.selectIncome}
          >
            <span className={styles.cardHeader}>
              <span className={styles.icon} aria-hidden="true">
                <i className={card.tone === 'expense' ? 'bi bi-arrow-down-right' : 'bi bi-arrow-up-right'} />
              </span>
              <span className={styles.count} aria-hidden="true">{card.count}</span>
            </span>
            <span className={styles.title}>{card.title}</span>
            <span className={styles.amounts}><strong className={styles.primary}>{card.primaryAmount}</strong>{card.secondaryAmount ? <span className={styles.secondary}>{card.secondaryAmount}{card.moreCurrenciesLabel ? ` · ${card.moreCurrenciesLabel}` : ''}</span> : null}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
