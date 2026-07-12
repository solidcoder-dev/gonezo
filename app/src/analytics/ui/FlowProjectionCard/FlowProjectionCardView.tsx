import { BalanceProjectionChartView } from '../../../shared/ui/Chart/BalanceProjectionChartView';
import { ChartSkeletonView } from '../../../shared/ui/Chart/ChartSkeletonView';
import type { FlowProjectionCardViewProps } from './FlowProjectionCardView.contract';
import styles from './FlowProjectionCardView.module.css';

function amountToneClass(amount: string): string {
  return Number(amount) < 0 ? styles.negative : styles.positive;
}

export function FlowProjectionCardView({ required, provided }: FlowProjectionCardViewProps) {
  const { data, state, status } = required;

  return (
    <section className={styles.card} aria-label="Cash flow position" aria-busy={status.loading}>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <article className={styles.summaryItem}>
            <span>Current balance</span>
            <strong className={`${styles.currentAmount} ${amountToneClass(data.currentBalanceAmount)}`}>{data.currentBalanceAmount}</strong>
          </article>
          <article className={styles.summaryItem}>
            <span>Expected end balance</span>
            <strong className={`${styles.expectedAmount} ${amountToneClass(data.expectedEndBalanceAmount)}`}>{data.expectedEndBalanceAmount}</strong>
          </article>
        </div>
        <article className={`${styles.summaryItem} ${styles.lowestRow}`}>
          <span>Lowest point</span>
          <div className={styles.lowestValue}>
            <strong className={styles.lowestAmount}>{data.lowestPointAmount}</strong>
            <span className={styles.lowestLabel}>on {data.lowestPointLabel}</span>
          </div>
        </article>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.header}>
          <h2>Balance projection</h2>
          <div className={styles.windowNav}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Previous cash flow window"
              disabled={status.disabled || status.loading || !state.canGoPreviousWindow}
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
        </div>

        <div className={styles.chartFrame}>
          {status.loading ? <ChartSkeletonView /> : null}
          {!status.loading ? (
            <BalanceProjectionChartView currentMarkerLabel={data.currentMarkerLabel} points={data.points} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type { FlowProjectionCardViewProps } from './FlowProjectionCardView.contract';
