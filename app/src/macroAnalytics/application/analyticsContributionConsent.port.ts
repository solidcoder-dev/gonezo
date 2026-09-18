import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';

export type AnalyticsContributionConsentPort = Readonly<{
  get(userId: string): Promise<AnalyticsContributionConsent | null>;
  save(decision: AnalyticsContributionConsent): Promise<void>;
}>;
