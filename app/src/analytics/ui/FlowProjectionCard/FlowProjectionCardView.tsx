import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartSkeletonView } from '../../../shared/ui/Chart/ChartSkeletonView';
import { buildUniformYAxisTicks, formatExactAxisValue } from '../../../shared/ui/Chart/chartScale';
import type { FlowProjectionCardViewProps } from './FlowProjectionCardView.contract';
import styles from './FlowProjectionCardView.module.css';

function maxChartValue(points: FlowProjectionCardViewProps['required']['data']['points']): number {
  return points.reduce((max, point) => Math.max(max, point.expectedBalanceAmount, point.postedBalanceAmount ?? 0, point.scheduledBalanceAmount ?? 0), 0);
}

function minChartValue(points: FlowProjectionCardViewProps['required']['data']['points']): number {
  return points.reduce((min, point) => Math.min(min, point.expectedBalanceAmount, point.postedBalanceAmount ?? point.expectedBalanceAmount, point.scheduledBalanceAmount ?? point.expectedBalanceAmount), 0);
}

function amountToneClass(amount: string): string {
  return Number(amount) < 0 ? styles.negative : styles.positive;
}

export function FlowProjectionCardView({ required, provided }: FlowProjectionCardViewProps) {
  const { data, state, status } = required;
  const yAxisTicks = buildUniformYAxisTicks(Math.max(maxChartValue(data.points), Math.abs(minChartValue(data.points))));

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
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.points} margin={{ top: 12, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="rgba(32, 32, 30, 0.08)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#74746b', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#74746b', fontSize: 11 }}
                  ticks={yAxisTicks}
                  domain={[Math.min(0, yAxisTicks[0] ?? 0), yAxisTicks.at(-1) ?? 0]}
                  tickFormatter={(value) => formatExactAxisValue(Number(value), '')}
                  width={42}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(32, 32, 30, 0.04)' }}
                  contentStyle={{
                    border: '1px solid rgba(32, 32, 30, 0.1)',
                    borderRadius: 12,
                    boxShadow: '0 12px 28px rgba(24, 24, 22, 0.12)',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [`${Number(value).toFixed(2)}`, name === 'postedBalanceAmount' ? 'Posted' : name === 'scheduledBalanceAmount' ? 'Scheduled' : 'Expected']}
                />
                <ReferenceLine x={data.currentMarkerLabel} stroke="rgba(32, 32, 30, 0.2)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="postedBalanceAmount" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="scheduledBalanceAmount" stroke="#93c5fd" strokeWidth={2} dot={false} strokeDasharray="6 5" connectNulls />
                <Line type="monotone" dataKey="expectedBalanceAmount" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="3 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export type { FlowProjectionCardViewProps } from './FlowProjectionCardView.contract';
