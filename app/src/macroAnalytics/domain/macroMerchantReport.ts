import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { CohortMerchantRankingItem } from './cohortMerchantRanking';

export type MacroMerchantReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  catalogVersion: number | null;
  merchantCoveragePercent: string;
  postedExpenseMerchants: readonly CohortMerchantRankingItem[];
}>;
