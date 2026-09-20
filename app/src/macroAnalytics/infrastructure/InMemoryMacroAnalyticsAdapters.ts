import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { AnalyticsContributorIdentityPort } from '../application/analyticsContributorIdentity.port';
import type { MacroAnalyticsOutboxPort } from '../application/macroAnalyticsOutbox.port';
import type { ContributionRebuildQueuePort } from '../application/contributionRebuildQueue.port';
import type { MacroAnalyticsBackfillStatePort, MacroAnalyticsBackfillState } from '../application/macroAnalyticsBackfillState.port';

export class InMemoryAnalyticsContributorIdentityAdapter implements AnalyticsContributorIdentityPort {
  private readonly identities = new Map<string, AnalyticsContributorId>();

  async get(userId: string): Promise<AnalyticsContributorId | null> {
    return this.identities.get(userId) ?? null;
  }

  async save(userId: string, contributorId: AnalyticsContributorId): Promise<void> {
    const existing = this.identities.get(userId);
    if (existing && existing !== contributorId) throw new Error('Analytics contributor identity conflict');
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

export class InMemoryContributionRebuildQueueAdapter implements ContributionRebuildQueuePort {
  private readonly periods = new Map<string, Set<string>>();

  async enqueue(userId: string, period: AnalyticsPeriod): Promise<void> {
    const periods = this.periods.get(userId) ?? new Set<string>();
    periods.add(period.value);
    this.periods.set(userId, periods);
  }

  async list(userId: string): Promise<readonly AnalyticsPeriod[]> {
    return [...(this.periods.get(userId) ?? [])].sort().map((period) => ({ kind: 'YEAR_MONTH', value: period }));
  }

  async remove(userId: string, period: AnalyticsPeriod): Promise<void> {
    this.periods.get(userId)?.delete(period.value);
  }

  async clear(userId: string): Promise<void> {
    this.periods.delete(userId);
  }
}

export class InMemoryMacroAnalyticsBackfillStateAdapter implements MacroAnalyticsBackfillStatePort {
  private readonly states = new Map<string, MacroAnalyticsBackfillState>();

  async get(userId: string): Promise<MacroAnalyticsBackfillState> {
    return this.states.get(userId) ?? { initialBackfillVersion: 0, fullRebuildRequested: false };
  }

  async markInitialBackfillComplete(userId: string, version: number): Promise<void> {
    const state = await this.get(userId);
    this.states.set(userId, { ...state, initialBackfillVersion: Math.max(state.initialBackfillVersion, version) });
  }

  async requestFullRebuild(userId: string): Promise<void> {
    const state = await this.get(userId);
    this.states.set(userId, { ...state, fullRebuildRequested: true });
  }

  async clearFullRebuildRequest(userId: string): Promise<void> {
    const state = await this.get(userId);
    this.states.set(userId, { ...state, fullRebuildRequested: false });
  }

  async clear(userId: string): Promise<void> {
    this.states.delete(userId);
  }
}
