import { describe, expect, it } from 'vitest';
import { parseAnalyticsContext, serializeAnalyticsContext } from './analyticsContext';

describe('analytics context', () => {
  it('round-trips custom periods, account ids, tags and meaningful options', () => {
    const context = {
      currency: 'eur',
      period: { kind: 'custom' as const, from: '2026-01-01', to: '2026-01-31' },
      accountIds: ['cash', 'bank'],
      tagIds: ['food', 'shared'],
      includeIgnoredMovements: true,
      includePlannedMovements: false,
      sharedAmountMode: 'full' as const,
    };

    expect(parseAnalyticsContext(`?${serializeAnalyticsContext(context)}`)).toEqual({ ...context, currency: 'EUR' });
  });

  it('omits defaults and safely normalizes malformed values', () => {
    expect(serializeAnalyticsContext({ currency: '', period: { kind: 'thisMonth' }, accountIds: [], tagIds: [], includeIgnoredMovements: false, includePlannedMovements: true, sharedAmountMode: 'personal' })).toBe('period=thisMonth');
    expect(parseAnalyticsContext('?period=rollingDays&days=nope&anchor=bad&accounts=,cash,,cash')).toMatchObject({ accountIds: ['cash'], period: { kind: 'rollingDays', days: 30 } });
  });
});
