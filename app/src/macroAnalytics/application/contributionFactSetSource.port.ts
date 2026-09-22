import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { CategoryFact } from '../domain/categoryFact';
import type { FinancialFact } from '../domain/financialFact';
import type { MerchantFact } from '../domain/merchantFact';
import type { RecurringFact } from '../domain/recurringFact';
import type { SharingFact } from '../domain/sharingFact';
import type { TagUsageFact } from '../domain/tagUsageFact';

export type ContributionFactSet = Readonly<{
  financial: readonly FinancialFact[];
  categories: readonly CategoryFact[];
  recurring: readonly RecurringFact[];
  sharing: readonly SharingFact[];
  merchants: readonly MerchantFact[];
  tagUsage: readonly TagUsageFact[];
}>;

export type ContributionFactSetQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type ContributionFactSetSourcePort = Readonly<{
  readContributionFacts(query: ContributionFactSetQuery): Promise<ContributionFactSet>;
}>;
