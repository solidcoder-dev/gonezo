import type { LatestMacroAnalyticsPublicationPort } from '../application/latestMacroAnalyticsPublication.port';
import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';

export class NativeLatestMacroAnalyticsPublicationAdapter implements LatestMacroAnalyticsPublicationPort {
  async find(contributorId: AnalyticsContributorId, period: AnalyticsPeriod): Promise<MacroAnalyticsPublication | null> {
    const { publication } = await MacroAnalyticsLocalStorageNativePlugin.getLatestPublication({
      contributorId,
      period: period.value,
    });
    return publication ?? null;
  }

  async save(publication: MacroAnalyticsPublication): Promise<void> {
    await MacroAnalyticsLocalStorageNativePlugin.saveLatestPublication({ publication });
  }
}
