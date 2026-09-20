import type { ContributionRebuildQueuePort } from '../application/contributionRebuildQueue.port';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';

export class NativeContributionRebuildQueueAdapter implements ContributionRebuildQueuePort {
  async enqueue(userId: string, period: AnalyticsPeriod): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.enqueueRebuildPeriod({ userId, period: period.value });
  }

  async list(userId: string): Promise<readonly AnalyticsPeriod[]> {
    const { periods } = await MacroAnalyticsLocalStorageNativePlugin.listRebuildPeriods({ userId });
    return periods.map(createAnalyticsPeriod);
  }

  async remove(userId: string, period: AnalyticsPeriod): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.removeRebuildPeriod({ userId, period: period.value });
  }

  async clear(userId: string): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.clearRebuildPeriods({ userId });
  }
}
