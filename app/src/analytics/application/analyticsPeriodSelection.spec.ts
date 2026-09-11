import { describe, expect, it } from 'vitest';
import { resolveAnalyticsPeriodSelectionWindow } from './analyticsPeriodSelection';

describe('analytics period selection', () => {
  it('resolves the immediately previous month and its comparison period', () => {
    const result = resolveAnalyticsPeriodSelectionWindow(
      { period: { kind: 'lastMonth' }, shift: -1 },
      '2026-09-11',
    );

    expect(result.currentRange).toEqual({ from: '2026-07-01', to: '2026-07-31' });
    expect(result.comparisonRange).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });

  it('moves a custom range by exactly its selected duration', () => {
    const result = resolveAnalyticsPeriodSelectionWindow(
      { period: { kind: 'custom', from: '2026-08-01', to: '2026-08-10' }, shift: -1 },
      '2026-09-11',
    );

    expect(result.currentRange).toEqual({ from: '2026-07-22', to: '2026-07-31' });
  });

  it('does not expose a navigable range for all time', () => {
    const result = resolveAnalyticsPeriodSelectionWindow(
      { period: { kind: 'allTime' }, shift: 0 },
      '2026-09-11',
    );

    expect(result.currentRange).toBeUndefined();
    expect(result.currentWindowLabel).toBe('All time');
  });
});
