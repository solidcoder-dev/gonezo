import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { CohortCategoryBreakdownItem } from './cohortCategoryBreakdown';

export type MacroCategoryReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  postedExpenseCategories: readonly CohortCategoryBreakdownItem[];
}>;
