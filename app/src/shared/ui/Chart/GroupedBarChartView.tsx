import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import type { GroupedBarChartViewProps } from './GroupedBarChartView.contract';
import styles from './GroupedBarChartView.module.css';

type RechartsPoint = {
  label: string;
  expense: number;
  income: number;
};

function toChartData(points: GroupedBarChartViewProps['points']): RechartsPoint[] {
  return points.map((point) => ({
    label: point.label,
    expense: point.values.find((value) => value.key === 'expense')?.value ?? 0,
    income: point.values.find((value) => value.key === 'income')?.value ?? 0,
  }));
}

function formatAxisValue(value: number, prefix = ''): string {
  if (value >= 1000) {
    return `${prefix}${Math.round(value / 1000)}k`;
  }
  return `${prefix}${Math.round(value)}`;
}

export function GroupedBarChartView({ points, valuePrefix }: GroupedBarChartViewProps) {
  const chartData = toChartData(points);
  const hasValues = chartData.some((point) => point.expense > 0 || point.income > 0);

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
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#74746b', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#74746b', fontSize: 11 }}
            tickFormatter={(value) => formatAxisValue(Number(value), valuePrefix)}
            width={46}
          />
          <Bar dataKey="expense" fill="rgba(194, 65, 12, 0.28)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="income" fill="#c2410c" radius={[6, 6, 0, 0]} />
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
