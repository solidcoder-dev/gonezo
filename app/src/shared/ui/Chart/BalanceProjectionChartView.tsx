import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatExactAxisValue } from './chartScale';

export type BalanceProjectionChartPointView = { key: string; occurredAt?: string; label: string; balance?: number; phase?: 'posted' | 'projected'; postedBalanceAmount?: number; scheduledBalanceAmount?: number; expectedBalanceAmount?: number };
type Props = { currentMarkerAt?: string; lowestAt?: string; domain?: [number, number]; ticks?: number[]; currentMarkerLabel?: string; points: BalanceProjectionChartPointView[] };

export function BalanceProjectionChartView({ currentMarkerAt, lowestAt, domain, ticks, currentMarkerLabel, points }: Props) {
  const data = points.map((point) => ({ ...point, occurredAt: point.occurredAt ?? point.key, balance: point.balance ?? point.expectedBalanceAmount ?? 0, postedBalance: point.phase ? (point.phase === 'posted' ? point.balance : undefined) : point.postedBalanceAmount, projectedBalance: point.phase ? (point.phase === 'projected' ? point.balance : undefined) : point.expectedBalanceAmount }));
  const values = data.map((point) => point.balance);
  const chartDomain = domain ?? [Math.min(0, ...values), Math.max(0, ...values)] as [number, number];
  const chartTicks = ticks ?? [chartDomain[0], chartDomain[1]];
  const marker = currentMarkerAt ?? currentMarkerLabel;
  const lowest = lowestAt ? data.find((point) => point.occurredAt === lowestAt) : undefined;
  const axisTicks = data.filter((point) => point.label).map((point) => point.key);
  const markerKey = data.find((point) => point.occurredAt === marker)?.key ?? marker;
  return <ResponsiveContainer width="100%" height={220}><LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}><CartesianGrid vertical={false} stroke="rgba(32,32,30,.08)" /><XAxis dataKey="key" ticks={axisTicks} interval={0} axisLine={false} tickLine={false} tick={{ fill: '#74746b', fontSize: 11 }} tickFormatter={(value) => data.find((point) => point.key === value)?.label ?? ''} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#74746b', fontSize: 11 }} ticks={chartTicks} domain={chartDomain} tickFormatter={(value) => formatExactAxisValue(Number(value), '')} width={48} /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)}`, 'Balance']} /><ReferenceLine x={markerKey} stroke="rgba(32,32,30,.2)" strokeDasharray="4 4" /><ReferenceLine x={lowest?.key} stroke="#e23b30" strokeDasharray="2 2" /><Line type="monotone" dataKey="postedBalance" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls /><Line type="monotone" dataKey="projectedBalance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 5" connectNulls /></LineChart></ResponsiveContainer>;
}
