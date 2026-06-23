import { AnalyticsPeriodMenuView } from '../AnalyticsPeriodMenuView';
import { ChartSkeletonView } from '../../../shared/ui/Chart/ChartSkeletonView';
import { GroupedBarChartView } from '../../../shared/ui/Chart/GroupedBarChartView';
import type { CashFlowChartCardViewProps } from './CashFlowChartCardView.contract';
import styles from './CashFlowChartCardView.module.css';

export function CashFlowChartCardView({ required, provided }: CashFlowChartCardViewProps) {
  const { data, state, status } = required;

  return (
    <section className={styles.card} aria-label="Cash flow" aria-busy={status.loading}>
      <div className={styles.header}>
        <h2>Cash flow</h2>
        <AnalyticsPeriodMenuView
          required={{
            state: { granularity: state.granularity },
            status: { disabled: status.disabled || status.loading },
          }}
          provided={{ commands: { selectGranularity: provided.commands.selectGranularity } }}
        />
      </div>

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
    </section>
  );
}

export type { CashFlowChartCardViewProps } from './CashFlowChartCardView.contract';
