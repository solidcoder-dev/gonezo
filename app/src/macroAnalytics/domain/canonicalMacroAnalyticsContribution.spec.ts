import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { canonicalMacroAnalyticsContribution } from './canonicalMacroAnalyticsContribution';

describe('canonicalMacroAnalyticsContribution V1 compatibility', () => {
  it('preserves the historical V1 canonical representation', () => {
    const period = createAnalyticsPeriod('2026-09');
    expect(canonicalMacroAnalyticsContribution({
      schemaVersion: 1,
      period,
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12.00', count: 1 }] }] },
    })).toBe('{"schemaVersion":1,"period":{"kind":"YEAR_MONTH","value":"2026-09"},"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[{"currency":"EUR","buckets":[{"source":"POSTED","kind":"EXPENSE","amount":"12.00","count":1}]}]}}');
  });

  it('canonicalizes V2 categories independent of input order and includes amount changes', () => {
    const period = createAnalyticsPeriod('2026-09');
    const contribution = {
      schemaVersion: 2 as const,
      period,
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
      financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '3', count: 2 }] }] },
      categories: { currencies: [{ currency: 'EUR', buckets: [
        { source: 'POSTED' as const, kind: 'EXPENSE' as const, category: 'GROCERIES' as const, amount: '2' },
        { source: 'POSTED' as const, kind: 'EXPENSE' as const, category: 'DINING' as const, amount: '1' },
      ] }] },
    };
    const reordered = { ...contribution, categories: { currencies: [{ currency: 'EUR', buckets: [...contribution.categories.currencies[0].buckets].reverse() }] } };
    expect(canonicalMacroAnalyticsContribution(contribution)).toBe(canonicalMacroAnalyticsContribution(reordered));
    expect(canonicalMacroAnalyticsContribution(contribution)).not.toBe(canonicalMacroAnalyticsContribution({
      ...contribution,
      categories: { currencies: [{ currency: 'EUR', buckets: contribution.categories.currencies[0].buckets.map((bucket) => bucket.category === 'GROCERIES' ? { ...bucket, amount: '2.01' } : bucket) }] },
    }));
    expect(canonicalMacroAnalyticsContribution(contribution)).toBe('{"schemaVersion":2,"period":{"kind":"YEAR_MONTH","value":"2026-09"},"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[{"currency":"EUR","buckets":[{"source":"POSTED","kind":"EXPENSE","amount":"3","count":2}]}]},"categories":{"currencies":[{"currency":"EUR","buckets":[{"source":"POSTED","kind":"EXPENSE","category":"DINING","amount":"1"},{"source":"POSTED","kind":"EXPENSE","category":"GROCERIES","amount":"2"}]}]}}');
  });

  it('canonicalizes V3 recurring buckets independent of order and includes amount and count changes', () => {
    const period = createAnalyticsPeriod('2026-09');
    const contribution = {
      schemaVersion: 3 as const,
      period,
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
      financial: { currencies: [] },
      categories: { currencies: [] },
      recurring: { currencies: [{ currency: 'EUR', buckets: [
        { source: 'SCHEDULED' as const, kind: 'EXPENSE' as const, amount: '0', occurrenceCount: 1, seriesCount: 1 },
        { source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '2.00', occurrenceCount: 2, seriesCount: 1 },
      ] }] },
    };
    const canonical = canonicalMacroAnalyticsContribution(contribution);
    expect(canonical).toContain('"recurring":{"currencies":[{"currency":"EUR","buckets":[{"source":"POSTED","kind":"EXPENSE","amount":"2.00","occurrenceCount":2,"seriesCount":1},{"source":"SCHEDULED","kind":"EXPENSE","amount":"0","occurrenceCount":1,"seriesCount":1}]}]}');
    expect(canonicalMacroAnalyticsContribution({ ...contribution, recurring: { currencies: [{ currency: 'EUR', buckets: [...contribution.recurring.currencies[0].buckets].reverse() }] } })).toBe(canonical);
    expect(canonicalMacroAnalyticsContribution({ ...contribution, recurring: { currencies: [{ currency: 'EUR', buckets: contribution.recurring.currencies[0].buckets.map((bucket) => bucket.source === 'POSTED' ? { ...bucket, amount: '2.01' } : bucket) }] } })).not.toBe(canonical);
    expect(canonicalMacroAnalyticsContribution({ ...contribution, recurring: { currencies: [{ currency: 'EUR', buckets: contribution.recurring.currencies[0].buckets.map((bucket) => bucket.source === 'POSTED' ? { ...bucket, occurrenceCount: 3 } : bucket) }] } })).not.toBe(canonical);
    expect(canonical).toBe('{"schemaVersion":3,"period":{"kind":"YEAR_MONTH","value":"2026-09"},"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[]},"categories":{"currencies":[]},"recurring":{"currencies":[{"currency":"EUR","buckets":[{"source":"POSTED","kind":"EXPENSE","amount":"2.00","occurrenceCount":2,"seriesCount":1},{"source":"SCHEDULED","kind":"EXPENSE","amount":"0","occurrenceCount":1,"seriesCount":1}]}]}}');
  });
});
