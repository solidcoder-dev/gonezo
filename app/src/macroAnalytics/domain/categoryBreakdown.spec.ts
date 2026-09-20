import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { createCohort } from './cohort';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { buildContributorCategoryBreakdown } from './contributorCategoryBreakdown';
import { buildCohortCategoryBreakdown } from './cohortCategoryBreakdown';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function v2(amounts: readonly Readonly<{ category: 'GROCERIES' | 'DINING' | 'UNMAPPED_EXPENSE'; amount: string }>[], currency = 'EUR'): MacroAnalyticsContribution {
  const financialTotal = amounts.reduce((total, item) => total.add(ExactDecimal.from(item.amount)), ExactDecimal.from('0')).toString();
  return {
    schemaVersion: 2, period, dimensions,
    financial: { currencies: [{ currency, buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: financialTotal || '0', count: 1 }] }] },
    categories: { currencies: [{ currency, buckets: amounts.map(({ category, amount }) => ({ source: 'POSTED', kind: 'EXPENSE', category, amount })) }] },
  };
}

describe('category breakdowns', () => {
  it('returns unavailable for V1 or a V2 contribution without selected currency', () => {
    const v1Contribution = { schemaVersion: 1, period, dimensions, financial: { currencies: [{ currency: 'EUR', buckets: [] }] } } as const;
    expect(buildContributorCategoryBreakdown(v1Contribution, 'EUR', 'POSTED', 'EXPENSE')).toBeNull();
    expect(buildContributorCategoryBreakdown(v2([], 'USD'), 'EUR', 'POSTED', 'EXPENSE')).toBeNull();
  });

  it('builds an empty selected currency breakdown and sorts contributor categories by amount then code', () => {
    expect(buildContributorCategoryBreakdown(v2([]), 'eur', 'POSTED', 'EXPENSE')).toMatchObject({ currency: 'EUR', items: [] });
    const breakdown = buildContributorCategoryBreakdown(v2([
      { category: 'GROCERIES', amount: '2' }, { category: 'DINING', amount: '3' }, { category: 'UNMAPPED_EXPENSE', amount: '3' },
    ]), 'EUR', 'POSTED', 'EXPENSE');
    expect(breakdown?.items.map(({ category, amount }) => [category, amount.value.toString()])).toEqual([
      ['DINING', '3'], ['UNMAPPED_EXPENSE', '3'], ['GROCERIES', '2'],
    ]);
  });

  it('excludes V1 and missing currency from eligibility, counts category zeros in exact medians, and reconciles shares', () => {
    const first = v2([{ category: 'GROCERIES', amount: '10' }, { category: 'UNMAPPED_EXPENSE', amount: '2' }]);
    const second = v2([{ category: 'DINING', amount: '6' }]);
    const third = v2([{ category: 'GROCERIES', amount: '2' }]);
    const missingCurrency = v2([{ category: 'GROCERIES', amount: '100' }], 'USD');
    const v1Contribution = { schemaVersion: 1, period, dimensions, financial: { currencies: [{ currency: 'EUR', buckets: [] }] } } as const;

    const breakdown = buildCohortCategoryBreakdown({ period, currency: 'EUR', cohort: createCohort(), contributions: [first, second, third, missingCurrency, v1Contribution] });

    expect(breakdown.eligibleContributorCount).toBe(3);
    expect(breakdown.items.map(({ category, totalAmount, medianAmount, activeContributorCount, sharePercent }) => ({
      category, total: totalAmount.value.toString(), median: medianAmount.value.toString(), activeContributorCount, sharePercent,
    }))).toEqual([
      { category: 'GROCERIES', total: '12', median: '2', activeContributorCount: 2, sharePercent: '60' },
      { category: 'DINING', total: '6', median: '0', activeContributorCount: 1, sharePercent: '30' },
      { category: 'UNMAPPED_EXPENSE', total: '2', median: '0', activeContributorCount: 1, sharePercent: '10' },
    ]);
  });

  it('uses an exact midpoint for an even eligible contributor count', () => {
    const breakdown = buildCohortCategoryBreakdown({
      period,
      currency: 'EUR',
      cohort: createCohort(),
      contributions: [v2([{ category: 'GROCERIES', amount: '0.10' }]), v2([{ category: 'GROCERIES', amount: '0.30' }])],
    });
    expect(breakdown.items[0].medianAmount.value.toString()).toBe('0.2');
  });
});
