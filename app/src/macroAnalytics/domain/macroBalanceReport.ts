import type { MetricValue } from '../../shared/domain/analyticsMetric';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { CohortAccountTypeBreakdownItem } from './cohortAccountTypeBreakdown';

export type MacroBalanceReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  medianPeriodEndAccountBalance: MetricValue | null;
  totalAccountCount: MetricValue | null;
  accountTypes: readonly CohortAccountTypeBreakdownItem[];
}>;
