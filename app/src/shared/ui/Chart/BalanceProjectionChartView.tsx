import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildUniformYAxisTicks, formatExactAxisValue } from './chartScale';

export type BalanceProjectionChartPointView = {
  key: string;
  label: string;
  postedBalanceAmount?: number;
  scheduledBalanceAmount?: number;
  expectedBalanceAmount: number;
};

type BalanceProjectionChartViewProps = {
  currentMarkerLabel: string;
  points: BalanceProjectionChartPointView[];
};

function maxChartValue(points: BalanceProjectionChartPointView[]): number {
  return points.reduce((max, point) => Math.max(max, point.expectedBalanceAmount, point.postedBalanceAmount ?? 0, point.scheduledBalanceAmount ?? 0), 0);
}

function minChartValue(points: BalanceProjectionChartPointView[]): number {
  return points.reduce((min, point) => Math.min(min, point.expectedBalanceAmount, point.postedBalanceAmount ?? point.expectedBalanceAmount, point.scheduledBalanceAmount ?? point.expectedBalanceAmount), 0);
}

export function BalanceProjectionChartView({ currentMarkerLabel, points }: BalanceProjectionChartViewProps) {
  const yAxisTicks = buildUniformYAxisTicks(Math.max(maxChartValue(points), Math.abs(minChartValue(points))));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 12, right: 4, bottom: 0, left: -16 }}>
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
        <ReferenceLine x={currentMarkerLabel} stroke="rgba(32, 32, 30, 0.2)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="postedBalanceAmount" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="scheduledBalanceAmount" stroke="#93c5fd" strokeWidth={2} dot={false} strokeDasharray="6 5" connectNulls />
        <Line type="monotone" dataKey="expectedBalanceAmount" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="3 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
