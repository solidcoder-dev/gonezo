import { describe, expect, it } from 'vitest';
import { presentFlowReport } from './flowPresenters';
import type { AnalyticsFlowReport } from './analyticsFlowReport';

function report(): AnalyticsFlowReport {
  const points = [...Array.from({ length: 31 }, (_, index) => ({ occurredAt: `2026-07-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`, balance: { value: '28000.00', currency: 'EUR' }, phase: 'posted' as const })), { occurredAt: '2026-08-01T00:00:00.000Z', balance: { value: '28000.00', currency: 'EUR' }, phase: 'posted' as const }];
  return { window: { start: '2026-07-01', endExclusive: '2026-08-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false }, windowRelation: 'current', projectionMode: 'accountBalance', currency: 'EUR', summary: { openingBalance: { value: '28000.00', currency: 'EUR' }, currentBalance: { value: '28000.00', currency: 'EUR' }, endBalance: { value: '28000.00', currency: 'EUR' }, netFlow: { value: '0.00', currency: 'EUR' }, lowestBalance: { amount: points[0].balance, occurredAt: points[0].occurredAt }, highestBalance: { amount: points[0].balance, occurredAt: points[0].occurredAt } }, projection: points, upcoming: { incomingTotal: { value: '0.00', currency: 'EUR' }, outgoingTotal: { value: '0.00', currency: 'EUR' }, incomingCount: 0, outgoingCount: 0 }, insights: [] };
}

describe('Flow presenters', () => {
  it('uses weekly axis labels for a monthly window without dropping chart points', () => {
    const points = presentFlowReport(report()).chart.points;
    expect(points).toHaveLength(32);
    expect(points.map((point) => point.label).filter(Boolean)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5']);
  });

  it('keeps all-time labels bounded and excludes the end-exclusive anchor', () => {
    const allTimeReport = report();
    allTimeReport.window = { ...allTimeReport.window, start: '2018-01-01', endExclusive: '2027-01-01' };
    allTimeReport.windowRelation = 'past';
    allTimeReport.projection = Array.from({ length: 10 }, (_, index) => ({
      occurredAt: `${2018 + index}-01-01T00:00:00.000Z`,
      balance: { value: `${28000 + index}.00`, currency: 'EUR' },
      phase: 'posted' as const,
    }));

    const labels = presentFlowReport(allTimeReport).chart.points.map((point) => point.label).filter(Boolean);

    expect(labels).toEqual(['2018', '2020', '2022', '2024', '2026']);
    expect(labels).not.toContain('2027');
  });
});
