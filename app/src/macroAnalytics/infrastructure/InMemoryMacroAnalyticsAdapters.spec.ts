import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { InMemoryAnalyticsContributorIdentityAdapter, InMemoryMacroAnalyticsOutboxAdapter } from './InMemoryMacroAnalyticsAdapters';

function publication(period: string, revision: number, contributorId = 'analytics-a') {
  const analyticsPeriod = createAnalyticsPeriod(period);
  const contribution: MacroAnalyticsContribution = {
    schemaVersion: 1,
    period: analyticsPeriod,
    dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
    financial: { currencies: [] },
  };
  return createMacroAnalyticsPublication({
    contributorId: createAnalyticsContributorId(contributorId),
    period: analyticsPeriod,
    revision,
    contribution,
  });
}

describe('in-memory Macro Analytics persistence contracts', () => {
  it('isolates contributor identity by user and rejects unexpected rotation', async () => {
    const identities = new InMemoryAnalyticsContributorIdentityAdapter();
    const first = createAnalyticsContributorId('analytics-a');
    await expect(identities.get('user-a')).resolves.toBeNull();
    await identities.save('user-a', first);
    await identities.save('user-a', first);
    await identities.save('user-b', createAnalyticsContributorId('analytics-b'));
    await expect(identities.get('user-a')).resolves.toBe(first);
    await expect(identities.get('user-b')).resolves.toBe(createAnalyticsContributorId('analytics-b'));
    await expect(identities.save('user-a', createAnalyticsContributorId('rotated-id'))).rejects.toThrow('identity conflict');
  });

  it('replaces one owner-period, sorts pending periods, and scopes remove and clear', async () => {
    const outbox = new InMemoryMacroAnalyticsOutboxAdapter();
    const september = publication('2026-09', 1);
    const october = publication('2026-10', 1);
    const replacement = publication('2026-09', 2);
    await expect(outbox.get('user-a', september.period)).resolves.toBeNull();
    await outbox.save('user-a', october);
    await outbox.save('user-a', september);
    await outbox.save('user-a', replacement);
    await outbox.save('user-b', publication('2026-09', 1, 'analytics-b'));
    await expect(outbox.get('user-a', september.period)).resolves.toEqual(replacement);
    await expect(outbox.listPending('user-a')).resolves.toEqual([replacement, october]);
    await outbox.remove('user-a', september.period);
    await expect(outbox.get('user-b', september.period)).resolves.not.toBeNull();
    await outbox.clear('user-a');
    await expect(outbox.listPending('user-a')).resolves.toEqual([]);
    await expect(outbox.listPending('user-b')).resolves.toHaveLength(1);
  });
});
