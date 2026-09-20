import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { CategoryFact } from '../domain/categoryFact';

export type CategoryFactQuery = Readonly<{ period: AnalyticsPeriod; timeZone: string; currency?: string }>;

export type CategoryFactSourcePort = Readonly<{
  listCategoryFacts(query: CategoryFactQuery): Promise<readonly CategoryFact[]>;
}>;
