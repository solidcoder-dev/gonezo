import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { AnalyticsPeriodSnapshotPort } from '../application/analyticsPeriodSnapshot.port';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsPeriodSnapshotSource(analytics: AnalyticsMovementFactReader): AnalyticsPeriodSnapshotPort {
  return {
    async readPeriodSnapshot(query) {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return Object.freeze({ period: query.period, movements: Object.freeze([...result.items]) });
    },
  };
}
