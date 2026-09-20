import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { buildContributorCategoryBreakdown } from './contributorCategoryBreakdown';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

const period = createAnalyticsPeriod('2026-09');
const v2: MacroAnalyticsContribution = {
  schemaVersion: 2, period,
  dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
  financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '5', count: 2 }] }] },
  categories: { currencies: [{ currency: 'EUR', buckets: [
    { source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '2' },
    { source: 'POSTED', kind: 'EXPENSE', category: 'DINING', amount: '3' },
  ] }] },
};

describe('buildContributorCategoryBreakdown', () => {
  it('returns unavailable for V1 and missing currencies, and an empty breakdown for a present currency without selected buckets', () => {
    const v1 = { schemaVersion: 1, period, dimensions: v2.dimensions, financial: v2.financial } as const;
    expect(buildContributorCategoryBreakdown(v1, 'EUR', 'POSTED', 'EXPENSE')).toBeNull();
    expect(buildContributorCategoryBreakdown(v2, 'USD', 'POSTED', 'EXPENSE')).toBeNull();
    expect(buildContributorCategoryBreakdown({ ...v2, categories: { currencies: [] } }, 'EUR', 'POSTED', 'EXPENSE')?.items).toEqual([]);
  });

  it('sorts matching category amounts descending with canonical category tie-breaks', () => {
    const result = buildContributorCategoryBreakdown(v2, 'eur', 'POSTED', 'EXPENSE');
    expect(result?.items.map(({ category, amount }) => [category, amount.value.toString()])).toEqual([['DINING', '3'], ['GROCERIES', '2']]);
  });
});
