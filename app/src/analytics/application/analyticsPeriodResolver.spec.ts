import { describe, expect, it } from 'vitest';
import { resolveAnalyticsPeriodWindow } from './analyticsPeriodResolver';

describe('analyticsPeriodResolver', () => {
  it('resolves this month and its elapsed previous-month comparison', () => {
    expect(resolveAnalyticsPeriodWindow(
      { kind: 'thisMonth' },
      '2026-07-12',
    )).toEqual({
      currentRange: { from: '2026-07-01', to: '2026-07-12' },
      comparisonRange: { from: '2026-06-01', to: '2026-06-12' },
      currentWindowLabel: 'Jul 1-Jul 12, 2026',
      comparisonWindowLabel: 'Jun 1-Jun 12, 2026',
    });
  });

  it('resolves last month across year boundaries', () => {
    expect(resolveAnalyticsPeriodWindow(
      { kind: 'lastMonth' },
      '2026-01-15',
    )).toEqual({
      currentRange: { from: '2025-12-01', to: '2025-12-31' },
      comparisonRange: { from: '2025-11-01', to: '2025-11-30' },
      currentWindowLabel: 'Dec 1-Dec 31, 2025',
      comparisonWindowLabel: 'Nov 1-Nov 30, 2025',
    });
  });

  it('resolves rolling three months with the same elapsed comparison length', () => {
    expect(resolveAnalyticsPeriodWindow(
      { kind: 'rollingMonths', months: 3, anchorDate: '2026-07-12' },
      '2026-07-12',
    )).toEqual({
      currentRange: { from: '2026-05-01', to: '2026-07-12' },
      comparisonRange: { from: '2026-02-17', to: '2026-04-30' },
      currentWindowLabel: 'May 1-Jul 12, 2026',
      comparisonWindowLabel: 'Feb 17-Apr 30, 2026',
    });
  });

  it('rejects invalid custom ranges', () => {
    expect(() => resolveAnalyticsPeriodWindow(
      { kind: 'custom', from: '2026-07-20', to: '2026-07-12' },
      '2026-07-12',
    )).toThrow('Analytics custom period requires from <= to');
  });

  it('returns no comparison for all time', () => {
    expect(resolveAnalyticsPeriodWindow(
      { kind: 'allTime' },
      '2026-07-12',
    )).toEqual({
      currentRange: undefined,
      comparisonRange: undefined,
      currentWindowLabel: 'All time',
      comparisonWindowLabel: undefined,
    });
  });
});
