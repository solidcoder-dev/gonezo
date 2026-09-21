import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { CategoryFactQuery, CategoryFactSourcePort } from '../application/categoryFactSource.port';
import type { CategoryFact } from '../domain/categoryFact';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';
import { macroCategoryCodeFor } from './macroCategoryMapper';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsCategoryFactSource(analytics: AnalyticsMovementFactReader): CategoryFactSourcePort {
  return {
    async listCategoryFacts(query: CategoryFactQuery): Promise<readonly CategoryFact[]> {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((fact) => {
        if (fact.ignored || (fact.type !== 'income' && fact.type !== 'expense')) return [];
        return fact.categoryAllocations.map((allocation, index) => ({
          id: `${fact.analyticsFactId}/category/${index}`,
          occurredAt: fact.effectiveAt,
          source: mapAnalyticsMovementSource(fact.source),
          kind: fact.type === 'income' ? 'INCOME' : 'EXPENSE',
          currency: fact.currency,
          amount: allocation.personalAmount,
          category: macroCategoryCodeFor(allocation.categoryId, fact.type === 'income' ? 'INCOME' : 'EXPENSE'),
        }));
      });
    },
  };
}
