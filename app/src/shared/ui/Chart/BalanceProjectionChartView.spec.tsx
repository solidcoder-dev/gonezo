import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BalanceProjectionChartView } from './BalanceProjectionChartView';

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReferenceLine: ({ x }: { x?: string }) => <span data-testid="reference-line">{x}</span>,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: (props: { dataKey: string; ticks?: string[]; interval?: number; tickFormatter?: (value: string) => string }) => <div data-testid="x-axis" data-key={props.dataKey} data-ticks={props.ticks?.join('|')} data-interval={props.interval}>{props.ticks?.map((tick) => <span key={tick}>{props.tickFormatter?.(tick)}</span>)}</div>,
  YAxis: () => null,
}));

describe('BalanceProjectionChartView', () => {
  it('uses explicit labelled point keys for the X axis', () => {
    render(<BalanceProjectionChartView lowestAt="2026-07-12" domain={[24000, 32000]} ticks={[24000, 28000, 32000]} points={[
      { key: '2026-07-01', occurredAt: '2026-07-01', label: 'W1', balance: 28000, phase: 'posted' },
      { key: '2026-07-02', occurredAt: '2026-07-02', label: '', balance: 28100, phase: 'posted' },
      { key: '2026-07-12', occurredAt: '2026-07-12', label: 'W2', balance: 27000, phase: 'posted' },
    ]} />);
    const axis = document.querySelector('[data-testid="x-axis"]');
    expect(axis).toHaveAttribute('data-key', 'key');
    expect(axis).toHaveAttribute('data-ticks', '2026-07-01|2026-07-12');
    expect(axis).toHaveAttribute('data-interval', '0');
    expect(axis).toHaveTextContent('W1W2');
  });
});
