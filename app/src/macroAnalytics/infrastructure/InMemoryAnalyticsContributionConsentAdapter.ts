import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from '../application/analyticsContributionConsent.port';

export class InMemoryAnalyticsContributionConsentAdapter implements AnalyticsContributionConsentPort {
  private readonly decisions = new Map<string, AnalyticsContributionConsent>();

  async get(userId: string): Promise<AnalyticsContributionConsent | null> {
    return this.decisions.get(userId) ?? null;
  }

  async save(decision: AnalyticsContributionConsent): Promise<void> {
    this.decisions.set(decision.userId, decision);
  }
}
