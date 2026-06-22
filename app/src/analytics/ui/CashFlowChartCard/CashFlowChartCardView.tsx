import type { LedgerCashFlowGranularity } from '../../../ledger/application/ledger.port';
import { ChartSkeletonView } from '../../../shared/ui/Chart/ChartSkeletonView';
import { GroupedBarChartView } from '../../../shared/ui/Chart/GroupedBarChartView';
import type { CashFlowChartCardViewProps } from './CashFlowChartCardView.contract';
import styles from './CashFlowChartCardView.module.css';

const GRANULARITIES: Array<{ value: LedgerCashFlowGranularity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function CashFlowChartCardView({ required, provided }: CashFlowChartCardViewProps) {
  const { data, state, status } = required;
  const showCurrencySelector = data.currencies.length > 1;

  return (
    <section className={styles.card} aria-label="Cash flow" aria-busy={status.loading}>
      <div className={styles.header}>
        <h2>Cash flow</h2>
      </div>

      {showCurrencySelector ? (
        <div className={styles.chips} aria-label="Currencies">
          {data.currencies.map((currency) => (
            <button
              key={currency}
              type="button"
              className={styles.chip}
              aria-pressed={currency === data.selectedCurrency}
              disabled={status.disabled}
              onClick={() => provided.commands.selectCurrency(currency)}
            >
              {currency}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.windowNav}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Previous cash flow window"
          disabled={status.disabled || status.loading}
          onClick={provided.commands.goToPreviousWindow}
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>
        <span>{data.windowLabel}</span>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Next cash flow window"
          disabled={status.disabled || status.loading || !state.canGoNextWindow}
          onClick={provided.commands.goToNextWindow}
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>

      <div className={styles.chartFrame}>
        {status.loading ? <ChartSkeletonView /> : null}
        {!status.loading ? <GroupedBarChartView points={data.points} /> : null}
      </div>

      <div className={styles.chips} aria-label="Cash flow duration">
        {GRANULARITIES.map((granularity) => (
          <button
            key={granularity.value}
            type="button"
            className={styles.chip}
            aria-pressed={granularity.value === state.granularity}
            disabled={status.disabled}
            onClick={() => provided.commands.selectGranularity(granularity.value)}
          >
            {granularity.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export type { CashFlowChartCardViewProps } from './CashFlowChartCardView.contract';
