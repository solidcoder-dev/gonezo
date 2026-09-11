import { describe, expect, it } from 'vitest';
import { buildAnalyticsFlowReport, type AnalyticsFlowFact } from './analyticsFlowReport';

const window = { start: '2026-07-01', endExclusive: '2026-08-01', selection: { period: { kind: 'thisMonth' as const }, shift: 0 }, canGoPrevious: true, canGoNext: false };
const fact = (id: string, source: AnalyticsFlowFact['source'], effectiveAt: string, type: AnalyticsFlowFact['type'], value: string): AnalyticsFlowFact => ({ id, source, effectiveAt, accountId: 'account-1', type, amount: { value, currency: 'EUR' } });

describe('analytics flow report', () => {
  it('characterizes same-currency transfer legs as balance impacts, never operating flow', () => {
    const transferOut = fact('transfer-out', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_out', '125.00');
    const transferIn = { ...fact('transfer-in', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_in', '125.00'), accountId: 'account-2' };

    const report = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'accountBalance',
      currency: 'EUR',
      openingBalance: { value: '1000.00', currency: 'EUR' },
      currentBalance: { value: '1000.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [transferOut, transferIn],
    });

    expect(report.summary.netFlow.value).toBe('0.00');
    expect(report.upcoming.incomingTotal.value).toBe('0.00');
    expect(report.upcoming.outgoingTotal.value).toBe('0.00');
    expect(report.summary.endBalance.value).toBe('1000.00');
  });

  it('characterizes scoped transfer legs independently for source and destination accounts', () => {
    const transferOut = fact('transfer-out', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_out', '125.00');
    const transferIn = { ...fact('transfer-in', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_in', '125.00'), accountId: 'account-2' };

    const sourceReport = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'EUR',
      openingBalance: { value: '1000.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [transferOut],
    });
    const destinationReport = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'EUR',
      openingBalance: { value: '1000.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [transferIn],
    });

    expect(sourceReport.summary.endBalance.value).toBe('875.00');
    expect(destinationReport.summary.endBalance.value).toBe('1125.00');
    expect(sourceReport.summary.netFlow.value).toBe('-125.00');
    expect(destinationReport.summary.netFlow.value).toBe('125.00');
  });

  it('characterizes FX transfer legs with their own amounts and currencies', () => {
    const sourceReport = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'EUR',
      openingBalance: { value: '1000.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [fact('transfer-out', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_out', '100.00')],
    });
    const destinationFact = { ...fact('transfer-in', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_in', '112.50'), accountId: 'account-2', amount: { value: '112.50', currency: 'USD' } };
    const destinationReport = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'USD',
      openingBalance: { value: '500.00', currency: 'USD' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [destinationFact],
    });

    expect(sourceReport.summary.endBalance.value).toBe('900.00');
    expect(destinationReport.summary.endBalance.value).toBe('612.50');
    expect(sourceReport.summary.netFlow.value).toBe('-100.00');
    expect(destinationReport.summary.netFlow.value).toBe('112.50');
  });

  it('characterizes modern transfer legs as non-operating movements', () => {
    const transferOut = fact('transfer-out', 'posted', '2026-07-15T10:00:00.000Z', 'transfer_out', '80.00');
    const transferIn = fact('transfer-in', 'posted', '2026-07-16T10:00:00.000Z', 'transfer_in', '80.00');

    const report = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'EUR',
      openingBalance: { value: '1000.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [transferOut, transferIn],
    });

    expect(report.summary.netFlow.value).toBe('0.00');
    expect(report.summary.endBalance.value).toBe('1000.00');
  });

  it('characterizes transfer period boundaries using the exact half-open window', () => {
    const inside = fact('inside', 'posted', '2026-07-31T23:59:59.999Z', 'transfer_in', '40.00');
    const outside = fact('outside', 'posted', '2026-08-01T00:00:00.000Z', 'transfer_in', '60.00');

    const report = buildAnalyticsFlowReport({
      window,
      windowRelation: 'current',
      projectionMode: 'filteredImpact',
      currency: 'EUR',
      openingBalance: { value: '100.00', currency: 'EUR' },
      now: '2026-07-20T12:00:00.000Z',
      facts: [inside, outside],
    });

    expect(report.summary.endBalance.value).toBe('140.00');
  });

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
