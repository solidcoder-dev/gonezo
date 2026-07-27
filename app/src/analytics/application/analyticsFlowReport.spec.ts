import { describe, expect, it } from 'vitest';
import { buildAnalyticsFlowReport, type AnalyticsFlowFact } from './analyticsFlowReport';

const window = { start: '2026-07-01', endExclusive: '2026-08-01', selection: { period: { kind: 'thisMonth' as const }, shift: 0 }, canGoPrevious: true, canGoNext: false };
const fact = (id: string, source: AnalyticsFlowFact['source'], effectiveAt: string, type: AnalyticsFlowFact['type'], value: string): AnalyticsFlowFact => ({ id, source, effectiveAt, accountId: 'account-1', type, amount: { value, currency: 'EUR' } });

describe('analytics flow report', () => {
  it('keeps the projection, summary and upcoming totals on one dataset', () => {
    const report = buildAnalyticsFlowReport({ window, windowRelation: 'current', projectionMode: 'accountBalance', currency: 'EUR', openingBalance: { value: '28000.00', currency: 'EUR' }, currentBalance: { value: '28000.00', currency: 'EUR' }, now: '2026-07-27T12:00:00.000Z', facts: [fact('posted-1', 'posted', '2026-07-10T10:00:00.000Z', 'expense', '100.25'), fact('expected-1', 'expected', '2026-07-29T10:00:00.000Z', 'income', '250.50'), fact('scheduled-1', 'scheduledProjection', '2026-07-30T10:00:00.000Z', 'expense', '50.25')] });
    expect(report.summary.endBalance.value).toBe('28100.00');
    expect(report.summary.netFlow.value).toBe('100.00');
    expect(report.upcoming).toMatchObject({ incomingTotal: { value: '250.50' }, outgoingTotal: { value: '50.25' }, incomingCount: 1, outgoingCount: 1 });
    expect(report.projection.at(-1)?.balance.value).toBe(report.summary.endBalance.value);
  });

  it('uses deterministic tie breaks and daily average', () => {
    const report = buildAnalyticsFlowReport({ window, windowRelation: 'past', projectionMode: 'filteredImpact', currency: 'EUR', openingBalance: { value: '100.00', currency: 'EUR' }, now: '2026-08-02T00:00:00.000Z', facts: [fact('b', 'posted', '2026-07-03T10:00:00.000Z', 'income', '10.00'), fact('a', 'posted', '2026-07-02T10:00:00.000Z', 'income', '10.00')] });
    expect(report.insights.find((item) => item.key === 'bestPeriod')?.occurredAt).toBe('2026-07-02');
    expect(report.insights.find((item) => item.key === 'averageDailyFlow')?.amount.value).toBe('0.64');
    expect(report.insights.find((item) => item.key === 'largestInflow')?.occurredAt).toBe('2026-07-02T10:00:00.000Z');
  });
});
