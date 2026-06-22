import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildUniformYAxisTicks, formatExactAxisValue } from './chartScale';
import type { GroupedBarChartViewProps } from './GroupedBarChartView.contract';
import styles from './GroupedBarChartView.module.css';

type RechartsPoint = {
  label: string;
  expense: number;
  income: number;
};

const SERIES_COLORS = {
  expense: '#fca5a5',
  income: '#86efac',
};

function toChartData(points: GroupedBarChartViewProps['points']): RechartsPoint[] {
  return points.map((point) => ({
    label: point.label,
    expense: point.values.find((value) => value.key === 'expense')?.value ?? 0,
    income: point.values.find((value) => value.key === 'income')?.value ?? 0,
  }));
}

function maxChartValue(points: RechartsPoint[]): number {
  return points.reduce((max, point) => Math.max(max, point.expense, point.income), 0);
}

function tooltipLabel(name: unknown): string {
  return name === 'income' ? 'Income' : 'Expense';
}

export function GroupedBarChartView({ points, valuePrefix }: GroupedBarChartViewProps) {
  const chartData = toChartData(points);
  const hasValues = chartData.some((point) => point.expense > 0 || point.income > 0);
  const yAxisTicks = buildUniformYAxisTicks(maxChartValue(chartData));

  if (!hasValues) {
    return <div className={styles.empty}>No cash flow data.</div>;
  }

  return (
    <>
      <div className={styles.chart}>
        <BarChart width={320} height={210} data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: -18 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="rgba(32, 32, 30, 0.08)" />
          <XAxis
            dataKey="label"
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#74746b', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#74746b', fontSize: 11 }}
            ticks={yAxisTicks}
            domain={[0, yAxisTicks.at(-1) ?? 0]}
            tickFormatter={(value) => formatExactAxisValue(Number(value), valuePrefix)}
            width={46}
          />
          <Tooltip
            cursor={{ fill: 'rgba(32, 32, 30, 0.04)' }}
            contentStyle={{
              border: '1px solid rgba(32, 32, 30, 0.1)',
              borderRadius: 12,
              boxShadow: '0 12px 28px rgba(24, 24, 22, 0.12)',
              fontSize: 12,
            }}
            formatter={(value, name) => [formatExactAxisValue(Number(value), valuePrefix), tooltipLabel(name)]}
          />
          <Bar dataKey="expense" fill={SERIES_COLORS.expense} radius={[6, 6, 0, 0]} />
          <Bar dataKey="income" fill={SERIES_COLORS.income} radius={[6, 6, 0, 0]} />
        </BarChart>
      </div>
      <dl className={styles.accessibleData} aria-label="Cash flow chart data">
        {chartData.map((point) => (
          <div key={point.label}>
            <dt>{point.label}</dt>
            <dd>{`Expense ${point.expense}; Income ${point.income}`}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export type { GroupedBarChartViewProps, GroupedBarChartPointView } from './GroupedBarChartView.contract';
