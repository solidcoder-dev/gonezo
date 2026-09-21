import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import type { MerchantFactQuery, MerchantFactSourcePort } from '../application/merchantFactSource.port';
import type { MerchantFact } from '../domain/merchantFact';
import { adaptAnalyticsMerchantFact } from './analyticsMerchantFactAdapter';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsMerchantFactSource(
  analytics: AnalyticsMovementFactReader,
  resolver: CanonicalMerchantResolverPort,
): MerchantFactSourcePort {
  return {
    async listMerchantFacts(query: MerchantFactQuery): Promise<readonly MerchantFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const fact = adaptAnalyticsMerchantFact(item, resolver);
        return fact === null ? [] : [fact];
      });
    },
  };
}
