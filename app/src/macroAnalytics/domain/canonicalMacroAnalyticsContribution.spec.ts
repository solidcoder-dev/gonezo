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
});
