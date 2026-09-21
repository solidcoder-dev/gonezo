import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricValue } from '../../shared/domain/analyticsMetric';

export type MacroTagUsageReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  medianTaggedPostedExpense: MetricValue | null;
  medianTaggedPostedExpenseSharePercent: MetricValue | null;
  medianTaggedPostedExpenseMovementPercent: MetricValue | null;
  taggedPostedExpenseContributorPercent: MetricValue | null;
}>;
