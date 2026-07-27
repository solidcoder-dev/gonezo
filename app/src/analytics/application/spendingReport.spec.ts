import { describe, expect, it } from 'vitest';
import { buildAnalyticsSpendingReport, buildSpendingCategories, buildSpendingTimeline, normalizeAnalyticsPeriodSelection, resolveAnalyticsSpendingWindow } from './spendingReport';

const movement = (id: string, occurredAt: string, amount: string, categoryId?: string) => ({ id, occurredAt, amount, currency: 'EUR', type: 'expense' as const, categoryId });

describe('Analytics spending read model', () => {
  it('normalizes selection shifts and prevents future windows', () => {
    const selection = normalizeAnalyticsPeriodSelection({ period: { kind: 'thisMonth' }, shift: 3 });
    expect(selection.shift).toBe(0);
    expect(resolveAnalyticsSpendingWindow({ period: { kind: 'thisMonth' }, shift: -1 }, '2026-07-15')).toMatchObject({ start: '2026-06-16', endExclusive: '2026-07-01', canGoNext: true });
  });

  it('resolves planned current-month spending through the last calendar day', () => {
    expect(resolveAnalyticsSpendingWindow({ period: { kind: 'thisMonth' }, shift: 0 }, '2026-07-27', undefined, true)).toMatchObject({ start: '2026-07-01', endExclusive: '2026-08-01' });
    expect(resolveAnalyticsSpendingWindow({ period: { kind: 'thisMonth' }, shift: 0 }, '2026-07-27', undefined, false)).toMatchObject({ start: '2026-07-01', endExclusive: '2026-07-28' });
  });

  it('resolves planned current-year spending through 31 December', () => {
    expect(resolveAnalyticsSpendingWindow({ period: { kind: 'thisYear' }, shift: 0 }, '2026-07-27', undefined, true)).toMatchObject({ start: '2026-01-01', endExclusive: '2027-01-01' });
  });

  it('uses an exclusive end and preserves a partial final weekly bucket', () => {
    const window = { start: '2026-01-01', endExclusive: '2026-02-01', selection: { period: { kind: 'custom', from: '2026-01-01', to: '2026-01-31' }, shift: 0 }, canGoPrevious: true, canGoNext: false } as const;
    const buckets = buildSpendingTimeline([movement('in', '2026-01-01T00:00:00Z', '1.01'), movement('out', '2026-02-01T00:00:00Z', '9.99')], window, 'EUR');
    expect(buckets).toHaveLength(5);
    expect(buckets[0].amount.value).toBe('1.01');
    expect(buckets.reduce((sum, bucket) => sum + Number(bucket.amount.value), 0)).toBe(1.01);
  });

  it('keeps total, timeline and categories coherent to cents', () => {
    const window = { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false } as const;
    const movements = [movement('a', '2026-06-01T00:00:00Z', '1.01', 'food'), movement('b', '2026-06-30T23:59:59Z', '2.09')];
    const report = buildAnalyticsSpendingReport({ window, currency: 'EUR', currentMovements: movements, previousMovements: [], categories: [{ id: 'food', name: 'Food' }] });
    expect(report.totalExpense.value).toBe('3.10');
    expect(report.timeline.reduce((sum, bucket) => sum + Math.round(Number(bucket.amount.value) * 100), 0)).toBe(310);
    expect(report.categories.reduce((sum, category) => sum + Math.round(Number(category.amount.value) * 100), 0)).toBe(310);
  });

  it('allocates split items and keeps uncategorized movements visible', () => {
    const window = { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false } as const;
    const categories = buildSpendingCategories([{ ...movement('a', '2026-06-01T00:00:00Z', '3.00'), items: [{ amount: '1.00', categoryId: 'food' }, { amount: '2.00' }] }], window, 'EUR', [{ id: 'food', name: 'Food' }]);
    expect(categories.map((category) => [category.categoryName, category.amount.value])).toEqual([['Uncategorized', '2.00'], ['Food', '1.00']]);
  });
});
