import { describe, expect, it } from 'vitest';
import { presentSpendingChartScale, presentSpendingSummary, presentTopExpenses } from './spendingPresenters';

describe('Spending presenters', () => {
  it('rounds the chart axis using the 1/2/5 policy', () => {
    expect(presentSpendingChartScale([447], ['W1'])).toMatchObject({ axisMax: 600, ticks: [0, 200, 400, 600] });
  });

  it('keeps zero bars at zero and exposes semantic comparison direction', () => {
    const report = presentSpendingSummary({
      window: { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false },
      currency: 'EUR', totalExpense: { value: '0.00', currency: 'EUR' }, previousExpense: { value: '10.00', currency: 'EUR' }, changePercent: -100,
      timeline: [{ start: '2026-06-01', endExclusive: '2026-07-01', amount: { value: '0.00', currency: 'EUR' }, sequence: 0 }], categories: [],
    });
    expect(report.chart.bars[0].heightPercent).toBe(0);
    expect(report.comparison?.direction).toBe('down');
    expect(report.range).toEqual({ start: '1 Jun', startYear: '2026', end: '30 Jun', endYear: '2026', sameYear: true });
  });

  it('labels chart buckets according to their temporal unit', () => {
    const makeReport = (start: string, endExclusive: string, count: number) => presentSpendingSummary({
      window: { start, endExclusive, selection: { period: { kind: 'custom', from: start, to: endExclusive }, shift: 0 }, canGoPrevious: true, canGoNext: false },
      currency: 'EUR', totalExpense: { value: '0.00', currency: 'EUR' }, timeline: Array.from({ length: count }, (_, sequence) => ({ start, endExclusive, amount: { value: '0.00', currency: 'EUR' }, sequence })), categories: [],
    });
    expect(makeReport('2026-07-01', '2026-07-08', 7).chart.bars[0].label).toBe('D1');
    expect(makeReport('2026-07-01', '2026-08-01', 5).chart.bars[0].label).toBe('W1');
    expect(makeReport('2026-01-01', '2026-08-01', 7).chart.bars[0].label).toBe('Jan');
    expect(makeReport('2020-01-01', '2023-01-01', 3).chart.bars[0].label).toBe('2020');
    expect(makeReport('2025-12-01', '2026-08-02', 9).range).toMatchObject({ start: '1 Dec', startYear: '2025', end: '1 Aug', endYear: '2026', sameYear: false });
  });

  it('applies top expense title and subtitle fallbacks in presentation', () => {
    const result = presentTopExpenses({ window: {} as never, totalCount: 1, items: [{ movementId: '1', amount: { value: '12.00', currency: 'EUR' }, occurredAt: '2026-06-01T00:00:00Z' }] });
    expect(result.items[0]).toMatchObject({ title: 'Expense', subtitle: 'Uncategorized', amount: '-€12.00' });
  });
});
