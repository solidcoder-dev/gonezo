import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { createCohort } from './cohort';
import { buildCohortMerchantRanking } from './cohortMerchantRanking';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };
function v5(contributorAmount: string, merchantAmount?: string): MacroAnalyticsContribution {
  return {
    schemaVersion: 5, period, dimensions,
    financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: contributorAmount, count: 1 }] }] },
    categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
    merchants: { catalogVersion: 1, currencies: merchantAmount === undefined ? [] : [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', merchant: 'UNMAPPED' as never, amount: merchantAmount, movementCount: 1 }] }] },
  };
}

describe('buildCohortMerchantRanking', () => {
  it('includes zero contributors in medians and uses all posted expenses for shares and coverage', () => {
    const result = buildCohortMerchantRanking({ period, currency: 'eur', cohort: createCohort(), contributions: [v5('100', '30'), v5('50'), { ...v5('25', '25'), period: createAnalyticsPeriod('2026-08') }] });
    expect(result.eligibleContributorCount).toBe(2);
    expect(result.catalogVersion).toBe(1);
    expect(result.merchantCoveragePercent).toBe('20');
    expect(result.items).toEqual([{ merchant: 'UNMAPPED', totalAmount: '30', medianAmount: '15', movementCount: 1, activeContributorCount: 1, shareOfPostedExpensePercent: '20' }]);
  });

  it('returns zero coverage and no merchants when eligible contributors have no merchant facts', () => {
    const result = buildCohortMerchantRanking({ period, currency: 'EUR', cohort: createCohort(), contributions: [v5('12')] });
    expect(result.merchantCoveragePercent).toBe('0');
    expect(result.items).toEqual([]);
  });
});
