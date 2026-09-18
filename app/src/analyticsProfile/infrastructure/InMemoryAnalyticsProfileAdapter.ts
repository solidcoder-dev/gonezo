import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from '../application/analyticsProfile.port';

export class InMemoryAnalyticsProfileAdapter implements AnalyticsProfilePort {
  private readonly profiles = new Map<string, AnalyticsProfile>();

  async get(userId: string): Promise<AnalyticsProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async save(draft: AnalyticsProfileDraft): Promise<AnalyticsProfile> {
    const now = new Date().toISOString();
    const profile: AnalyticsProfile = {
      ...draft,
      completedAt: this.profiles.get(draft.userId)?.completedAt ?? now,
      updatedAt: now,
    };
    this.profiles.set(draft.userId, profile);
    return profile;
  }
}
