import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import { validateAnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from './analyticsProfile.port';

export async function getAnalyticsProfile(port: AnalyticsProfilePort, userId: string): Promise<AnalyticsProfile | null> {
  return port.get(userId);
}

export async function saveAnalyticsProfile(port: AnalyticsProfilePort, draft: AnalyticsProfileDraft): Promise<AnalyticsProfile> {
  const errors = validateAnalyticsProfileDraft(draft);
  if (Object.keys(errors).length > 0) throw new Error('Complete all required profile fields.');
  return port.save(draft);
}
