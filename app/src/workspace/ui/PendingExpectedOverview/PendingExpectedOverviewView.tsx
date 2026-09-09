import type { ViewProps } from '../../../shared/ui/ViewProps';
import styles from './PendingExpectedOverviewView.module.css';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';

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
  { amountVisibility?: AmountVisibility },
  { cards: [PendingExpectedCardView, PendingExpectedCardView] },
  Record<string, never>,
  { loading: boolean; error?: string },
  { selectExpense: () => void; selectIncome: () => void }
>;

export function PendingExpectedOverviewView({ required, provided }: PendingExpectedOverviewViewProps) {
  if (required.status.loading) {
    return <section className={styles.section} aria-label="Expected movements" aria-busy="true"><div className={styles.heading}><h2 className={`${styles.sectionLabel} text-uppercase m-0`}>Expected movements</h2></div><div className={`${styles.cards} d-grid gap-3`}><div className={styles.skeleton} /><div className={styles.skeleton} /></div></section>;
  }

  return (
    <section className={styles.section} aria-label="Expected movements" aria-busy="false">
      <div className={styles.heading}><h2 className={`${styles.sectionLabel} text-uppercase m-0`}>Expected movements</h2></div>
      {required.status.error ? <p role="alert">{required.status.error}</p> : null}
      <div className={`${styles.cards} d-grid gap-3`}>
        {required.data.cards.map((card, index) => (
          <button
            key={card.title}
            type="button"
            className={`${styles.card} ${styles[card.tone]} ${card.disabled ? styles.disabled : ''} d-flex flex-column align-items-center text-center w-100`}
            disabled={card.disabled}
            aria-label={card.accessibleLabel}
            onClick={index === 0 ? provided.commands.selectExpense : provided.commands.selectIncome}
          >
            <span className={`${styles.cardHeader} d-flex align-items-center gap-1 w-100`}>
              <span className={styles.icon} aria-hidden="true">
                <i className={card.tone === 'expense' ? 'bi bi-arrow-down-right' : 'bi bi-arrow-up-right'} />
              </span>
              <span className={styles.title}>{card.title}</span>
              <span className={`${styles.count} ms-auto`} aria-hidden="true">{card.count}</span>
            </span>
            <span className={`${styles.amounts} d-flex flex-column align-items-center gap-1 w-100`}><strong className={`${styles.primary} text-nowrap`}>{required.config.amountVisibility === 'hidden' ? <FinancialAmountView formattedAmount={card.primaryAmount.replace(/^[+-]/, '')} sign={card.primaryAmount.startsWith('-') ? '-' : card.primaryAmount.startsWith('+') ? '+' : undefined} tone={card.tone} visibility="hidden" /> : card.primaryAmount}</strong>{card.secondaryAmount ? <span className={styles.secondary}>{required.config.amountVisibility === 'hidden' ? <FinancialAmountView formattedAmount={card.secondaryAmount.replace(/^[+-]/, '')} sign={card.secondaryAmount.startsWith('-') ? '-' : card.secondaryAmount.startsWith('+') ? '+' : undefined} tone={card.tone} visibility="hidden" /> : card.secondaryAmount}{card.moreCurrenciesLabel ? ` · ${card.moreCurrenciesLabel}` : ''}</span> : null}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
