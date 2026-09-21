import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsAccountBalanceFactSource } from './analyticsAccountBalanceFactSource';

describe('account balance fact adapter', () => {
  it('maps a period to the next-month snapshot cutoff and drops account IDs', async () => {
    const analytics = { analyticsGetAccountBalanceSnapshot: vi.fn(async () => ({
      asOfLocalDateExclusive: '2027-01-01',
      zoneId: 'UTC',
      items: [{ accountId: 'private-account', accountType: 'bank' as const, currency: 'EUR', balanceAmount: '15.005' }],
    })) };
    const source = createAnalyticsAccountBalanceFactSource(analytics);
    const facts = await source.listAccountBalanceFacts({ period: { kind: 'YEAR_MONTH', value: '2026-12' }, timeZone: 'Europe/Madrid', currency: 'eur' });
    expect(analytics.analyticsGetAccountBalanceSnapshot).toHaveBeenCalledWith({ asOfLocalDateExclusive: '2027-01-01', zoneId: 'Europe/Madrid', currency: 'eur' });
    expect(facts).toEqual([{ asOfLocalDateExclusive: '2027-01-01', accountType: 'BANK', currency: 'EUR', balanceAmount: '15.005' }]);
    expect(JSON.stringify(facts)).not.toContain('private-account');
  });

  it('maps a non-December period to the following month', async () => {
    const analytics = { analyticsGetAccountBalanceSnapshot: vi.fn(async () => ({
      asOfLocalDateExclusive: '2026-10-01', zoneId: 'UTC', items: [],
    })) };
    const source = createAnalyticsAccountBalanceFactSource(analytics);
    await source.listAccountBalanceFacts({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'UTC' });
    expect(analytics.analyticsGetAccountBalanceSnapshot).toHaveBeenCalledWith({ asOfLocalDateExclusive: '2026-10-01', zoneId: 'UTC' });
  });
});
