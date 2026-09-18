import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from '../application/analyticsProfile.port';
import { AnalyticsProfileNativePlugin } from './analyticsProfilePlugin';

export class NativeAnalyticsProfileAdapter implements AnalyticsProfilePort {
  async get(userId: string): Promise<AnalyticsProfile | null> {
    const { profile } = await AnalyticsProfileNativePlugin.get({ userId });
    return profile ?? null;
  }

  async save(draft: AnalyticsProfileDraft): Promise<AnalyticsProfile> {
    const now = new Date().toISOString();
    const existing = await this.get(draft.userId);
    const profile: AnalyticsProfile = { ...draft, completedAt: existing?.completedAt ?? now, updatedAt: now };
    await AnalyticsProfileNativePlugin.save({ profile });
    return profile;
  }
}
