import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';

export type AnalyticsProfilePort = {
  get(userId: string): Promise<AnalyticsProfile | null>;
  save(draft: AnalyticsProfileDraft): Promise<AnalyticsProfile>;
};
