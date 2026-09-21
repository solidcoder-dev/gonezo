import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { createCohort } from './cohort';
import { buildCohortAccountTypeBreakdown } from './cohortAccountTypeBreakdown';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

const period = createAnalyticsPeriod('2026-09');
const cohort = createCohort({ countryCode: 'ES', sex: 'FEMALE', ageBand: '25_34' });
function contribution(buckets: readonly { accountType: 'BANK' | 'CASH'; balanceAmount: string; accountCount: number }[]): MacroAnalyticsContribution {
  return {
    schemaVersion: 6, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' }, financial: { currencies: [] },
    categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] },
    balances: { currencies: [{ currency: 'EUR', buckets }] },
  };
}

describe('buildCohortAccountTypeBreakdown', () => {
  it('includes missing types as zero in median and counts zero-balance accounts', () => {
    const result = buildCohortAccountTypeBreakdown({ period, currency: 'EUR', cohort, contributions: [
      contribution([{ accountType: 'BANK', balanceAmount: '-10', accountCount: 1 }, { accountType: 'CASH', balanceAmount: '0', accountCount: 1 }]),
      contribution([{ accountType: 'BANK', balanceAmount: '20', accountCount: 1 }]),
    ] });
    expect(result.eligibleContributorCount).toBe(2);
    expect(result.items).toEqual([
      { accountType: 'BANK', totalBalanceAmount: '10', medianBalanceAmount: '5', totalAccountCount: 2, contributorCountWithType: 2, contributorPercent: '100' },
      { accountType: 'CASH', totalBalanceAmount: '0', medianBalanceAmount: '0', totalAccountCount: 1, contributorCountWithType: 1, contributorPercent: '50' },
    ]);
  });
});
