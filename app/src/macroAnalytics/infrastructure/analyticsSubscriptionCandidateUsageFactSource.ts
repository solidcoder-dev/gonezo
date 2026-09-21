import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { SubscriptionCandidateUsageFactSourcePort, SubscriptionCandidateUsageFactQuery } from '../application/subscriptionCandidateUsageFactSource.port';
import type { SubscriptionCandidateUsageFact } from '../domain/subscriptionCandidateUsageFact';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';
import { adaptAnalyticsSubscriptionCandidateUsageFact } from './analyticsSubscriptionCandidateUsageFactAdapter';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsSubscriptionCandidateUsageFactSource(analytics: AnalyticsMovementFactReader): SubscriptionCandidateUsageFactSourcePort {
  return {
    async listSubscriptionCandidateUsageFacts(query: SubscriptionCandidateUsageFactQuery): Promise<readonly SubscriptionCandidateUsageFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const fact = adaptAnalyticsSubscriptionCandidateUsageFact(item);
        return fact === null ? [] : [fact];
      });
    },
  };
}
