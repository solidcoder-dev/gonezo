import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsContributorIdentityPort } from '../application/analyticsContributorIdentity.port';
import type { MacroAnalyticsOutboxPort } from '../application/macroAnalyticsOutbox.port';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';

export class NativeAnalyticsContributorIdentityAdapter implements AnalyticsContributorIdentityPort {
  async get(userId: string) {
    const { contributorId } = await MacroAnalyticsLocalStorageNativePlugin.getContributorId({ userId });
    return contributorId ? createAnalyticsContributorId(contributorId) : null;
  }

  async save(userId: string, contributorId: ReturnType<typeof createAnalyticsContributorId>): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.saveContributorId({ userId, contributorId });
  }
}

export class NativeMacroAnalyticsOutboxAdapter implements MacroAnalyticsOutboxPort {
  async get(userId: string, period: AnalyticsPeriod): Promise<MacroAnalyticsPublication | null> {
    const { publication } = await MacroAnalyticsLocalStorageNativePlugin.getPublication({ userId, period: period.value });
    return publication ?? null;
  }

  async save(userId: string, publication: MacroAnalyticsPublication): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.savePublication({ userId, publication });
  }

  async remove(userId: string, period: AnalyticsPeriod): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.removePublication({ userId, period: period.value });
  }

  async listPending(userId: string): Promise<readonly MacroAnalyticsPublication[]> {
    const { publications } = await MacroAnalyticsLocalStorageNativePlugin.listPublications({ userId });
    return [...publications].sort((left, right) => left.period.value.localeCompare(right.period.value));
  }

  async clear(userId: string): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.clearPublications({ userId });
  }
}
