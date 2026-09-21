import type {
  AnalyticsListMovementFactsInput,
  AnalyticsListMovementFactsResult,
} from '../../analytics/application/analytics.port';
import type { TagUsageFactQuery, TagUsageFactSourcePort } from '../application/tagUsageFactSource.port';
import type { TagUsageFact } from '../domain/tagUsageFact';
import { adaptAnalyticsTagUsageFact } from './analyticsTagUsageFactAdapter';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsTagUsageFactSource(analytics: AnalyticsMovementFactReader): TagUsageFactSourcePort {
  return {
    async listTagUsageFacts(query: TagUsageFactQuery): Promise<readonly TagUsageFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const fact = adaptAnalyticsTagUsageFact(item);
        return fact === null ? [] : [fact];
      });
    },
  };
}
