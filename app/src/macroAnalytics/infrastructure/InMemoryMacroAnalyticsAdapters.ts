import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { AnalyticsContributorIdentityPort } from '../application/analyticsContributorIdentity.port';
import type { MacroAnalyticsOutboxPort } from '../application/macroAnalyticsOutbox.port';

export class InMemoryAnalyticsContributorIdentityAdapter implements AnalyticsContributorIdentityPort {
  private readonly identities = new Map<string, AnalyticsContributorId>();

  async get(userId: string): Promise<AnalyticsContributorId | null> {
    return this.identities.get(userId) ?? null;
  }

  async save(userId: string, contributorId: AnalyticsContributorId): Promise<void> {
    this.identities.set(userId, contributorId);
  }
}

export class InMemoryMacroAnalyticsOutboxAdapter implements MacroAnalyticsOutboxPort {
  private readonly publications = new Map<string, Map<string, MacroAnalyticsPublication>>();

  async get(userId: string, period: AnalyticsPeriod): Promise<MacroAnalyticsPublication | null> {
    return this.publications.get(userId)?.get(period.value) ?? null;
  }

  async save(userId: string, publication: MacroAnalyticsPublication): Promise<void> {
    const userPublications = this.publications.get(userId) ?? new Map<string, MacroAnalyticsPublication>();
    userPublications.set(publication.period.value, publication);
    this.publications.set(userId, userPublications);
  }

  async remove(userId: string, period: AnalyticsPeriod): Promise<void> {
    this.publications.get(userId)?.delete(period.value);
  }

  async listPending(userId: string): Promise<readonly MacroAnalyticsPublication[]> {
    return [...(this.publications.get(userId)?.values() ?? [])].sort((left, right) => left.period.value.localeCompare(right.period.value));
  }

  async clear(userId: string): Promise<void> {
    this.publications.delete(userId);
  }
}
