import type {
  AnalyticsListMovementFactsInput,
  AnalyticsListMovementFactsResult,
} from '../../analytics/application/analytics.port';
import type {
  FinancialFactQuery,
  FinancialFactSourcePort,
} from '../application/financialFactSource.port';
import type { FinancialFact } from '../domain/financialFact';
import { adaptAnalyticsMovementFact } from './analyticsMovementFactAdapter';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsFinancialFactSource(
  analytics: AnalyticsMovementFactReader,
): FinancialFactSourcePort {
  return {
    async listFinancialFacts(query: FinancialFactQuery): Promise<readonly FinancialFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const fact = adaptAnalyticsMovementFact(item);
        return fact === null ? [] : [fact];
      });
    },
  };
}
