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

    expect(await getContributionConsent(port, 'user-A')).toBeNull();
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
});
