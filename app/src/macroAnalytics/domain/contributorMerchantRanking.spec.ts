import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { buildContributorMerchantRanking } from './contributorMerchantRanking';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

describe('buildContributorMerchantRanking', () => {
  it('requires V5 and a selected financial currency, while keeping zero merchant facts visible', () => {
    const period = createAnalyticsPeriod('2026-09');
    const base = { period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const }, financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '2', count: 1 }] }] } };
    const v4 = { ...base, schemaVersion: 4 as const, categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] } } as MacroAnalyticsContribution;
    expect(buildContributorMerchantRanking(v4, 'EUR', 'POSTED', 'EXPENSE')).toBeNull();
    const v5: MacroAnalyticsContribution = { ...base, schemaVersion: 5, categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', merchant: 'UNMAPPED' as never, amount: '0', movementCount: 1 }] }] } };
    expect(buildContributorMerchantRanking(v5, 'USD', 'POSTED', 'EXPENSE')).toBeNull();
    expect(buildContributorMerchantRanking(v5, 'eur', 'POSTED', 'EXPENSE')?.items).toEqual([{ merchant: 'UNMAPPED', amount: '0', movementCount: 1 }]);
  });
});
