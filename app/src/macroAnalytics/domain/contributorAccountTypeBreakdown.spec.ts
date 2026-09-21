import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { buildContributorAccountTypeBreakdown } from './contributorAccountTypeBreakdown';

describe('buildContributorAccountTypeBreakdown', () => {
  it('returns only canonical selected-currency account type totals', () => {
    const period = createAnalyticsPeriod('2026-09');
    const result = buildContributorAccountTypeBreakdown({
      schemaVersion: 6, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' }, financial: { currencies: [] },
      categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] },
      balances: { currencies: [{ currency: 'EUR', buckets: [{ accountType: 'CASH', balanceAmount: '0', accountCount: 1 }, { accountType: 'BANK', balanceAmount: '-1', accountCount: 1 }] }] },
    }, 'eur');
    expect(result?.items.map(({ accountType }) => accountType)).toEqual(['BANK', 'CASH']);
  });
});
