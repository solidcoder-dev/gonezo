import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { RecurringFactQuery, RecurringFactSourcePort } from '../application/recurringFactSource.port';
import type { RecurringFact } from '../domain/recurringFact';
import { adaptAnalyticsRecurringFact } from './analyticsRecurringFactAdapter';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsRecurringFactSource(
  analytics: AnalyticsMovementFactReader,
): RecurringFactSourcePort {
  return {
    async listRecurringFacts(query: RecurringFactQuery): Promise<readonly RecurringFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const fact = adaptAnalyticsRecurringFact(item);
        return fact === null ? [] : [fact];
      });
    },
  };
}
