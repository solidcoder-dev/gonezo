import { registerPlugin } from '@capacitor/core';
import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';

export type AnalyticsContributionConsentPlugin = {
  get(options: { userId: string }): Promise<{ consent?: AnalyticsContributionConsent }>;
  save(options: { consent: AnalyticsContributionConsent }): Promise<void>;
};

export const AnalyticsContributionConsentNativePlugin = registerPlugin<AnalyticsContributionConsentPlugin>('AnalyticsContributionConsentPlugin');
