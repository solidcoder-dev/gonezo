import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

export type LatestMacroAnalyticsPublicationPort = Readonly<{
  find(contributorId: AnalyticsContributorId, period: AnalyticsPeriod): Promise<MacroAnalyticsPublication | null>;
  save(publication: MacroAnalyticsPublication): Promise<void>;
}>;
