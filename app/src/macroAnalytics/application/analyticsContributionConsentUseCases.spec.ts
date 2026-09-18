import { describe, expect, it } from 'vitest';
import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { canContribute } from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import {
  declineContributionConsent,
  getContributionConsent,
  grantContributionConsent,
  withdrawContributionConsent,
} from './analyticsContributionConsentUseCases';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication, type MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';

class MemoryConsentPort implements AnalyticsContributionConsentPort {
  readonly decisions = new Map<string, AnalyticsContributionConsent>();

  async get(userId: string) {
    return this.decisions.get(userId) ?? null;
  }

  async save(decision: AnalyticsContributionConsent) {
    this.decisions.set(decision.userId, decision);
  }
}

describe('analytics contribution consent use cases', () => {
  it('keeps decisions isolated by user and permits only an explicit grant', async () => {
    const port = new MemoryConsentPort();
    const clock = () => '2026-09-18T10:00:00.000Z';

    const undecided = await getContributionConsent(port, 'user-A');
    expect(undecided).toBeNull();
    expect(canContribute(undecided)).toBe(false);
    await grantContributionConsent(port, 'user-A', clock);
    expect(canContribute(await getContributionConsent(port, 'user-A'))).toBe(true);
    expect(await getContributionConsent(port, 'user-B')).toBeNull();

    await declineContributionConsent(port, 'user-A', clock);
    expect(canContribute(await getContributionConsent(port, 'user-A'))).toBe(false);
    await grantContributionConsent(port, 'user-A', clock);
    await withdrawContributionConsent(port, 'user-A', clock);
    expect((await getContributionConsent(port, 'user-A'))?.status).toBe('WITHDRAWN');
    expect(canContribute(await getContributionConsent(port, 'user-A'))).toBe(false);
  });

  it('clears every local pending period when consent is withdrawn', async () => {
    const port = new MemoryConsentPort();
    const pending = new Map<string, MacroAnalyticsPublication>();
    const outbox: MacroAnalyticsOutboxPort = {
      get: async (_userId, period) => pending.get(period.value) ?? null,
      save: async (_userId, publication) => { pending.set(publication.period.value, publication); },
      remove: async (_userId, period) => { pending.delete(period.value); },
      listPending: async () => [...pending.values()],
      clear: async () => { pending.clear(); },
    };
    await grantContributionConsent(port, 'user-A', () => '2026-09-01T00:00:00Z');
    const contribution = {
      schemaVersion: 1 as const,
      period: createAnalyticsPeriod('2026-07'),
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
      financial: { currencies: [] },
    };
    for (const month of ['2026-07', '2026-08', '2026-09']) {
      const monthlyContribution = { ...contribution, period: createAnalyticsPeriod(month) };
      await outbox.save('user-A', createMacroAnalyticsPublication({
        contributorId: createAnalyticsContributorId('opaque-id'), period: monthlyContribution.period, revision: 1, contribution: monthlyContribution,
      }));
    }
    await withdrawContributionConsent(port, 'user-A', () => '2026-09-18T10:00:00Z', outbox);
    expect(await outbox.listPending('user-A')).toEqual([]);
  });
});
