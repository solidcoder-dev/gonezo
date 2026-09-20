import { describe, expect, it } from 'vitest';
import { createAnalyticsQueryContext } from './analyticsQueryContext';

describe('analytics query context', () => {
  it('normalizes query filters and resolves current and comparable month windows', () => {
    const context = createAnalyticsQueryContext({
      filters: { currency: ' eur ', period: { kind: 'thisMonth' }, accountIds: [' account-1 ', 'account-1'] },
      referenceDate: '2026-07-12',
    });
    expect(context).toMatchObject({
      currency: 'EUR',
      filters: { currency: 'EUR', accountIds: ['account-1'], includePlannedMovements: false },
      currentWindow: { from: '2026-07-01', to: '2026-07-12' },
      comparisonWindow: { from: '2026-06-01', to: '2026-06-12' },
    });
  });

  it('resolves shifted, custom, planned and all-time window semantics', () => {
    expect(createAnalyticsQueryContext({ filters: { period: { kind: 'thisMonth' } }, referenceDate: '2026-07-12', shift: -1 }).currentWindow)
      .toEqual({ from: '2026-06-01', to: '2026-06-12' });
    expect(createAnalyticsQueryContext({ filters: { period: { kind: 'custom', from: '2026-06-03', to: '2026-06-08' } }, referenceDate: '2026-07-12' }).comparisonWindow)
      .toEqual({ from: '2026-05-28', to: '2026-06-02' });
    expect(createAnalyticsQueryContext({ filters: { period: { kind: 'thisMonth' }, includePlannedMovements: true }, referenceDate: '2026-07-31' }).currentWindow)
      .toEqual({ from: '2026-07-01', to: '2026-07-31' });
    expect(createAnalyticsQueryContext({ filters: { period: { kind: 'allTime' } }, referenceDate: '2026-07-12' }).currentWindow).toBeUndefined();
  });
});
