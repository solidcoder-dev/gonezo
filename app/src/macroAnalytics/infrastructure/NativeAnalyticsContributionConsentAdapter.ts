import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from '../application/analyticsContributionConsent.port';
import { AnalyticsContributionConsentNativePlugin } from './analyticsContributionConsentPlugin';

export class NativeAnalyticsContributionConsentAdapter implements AnalyticsContributionConsentPort {
  async get(userId: string): Promise<AnalyticsContributionConsent | null> {
    const { consent } = await AnalyticsContributionConsentNativePlugin.get({ userId });
    return consent ?? null;
  }

  async save(consent: AnalyticsContributionConsent): Promise<void> {
    await AnalyticsContributionConsentNativePlugin.save({ consent });
  }
}
