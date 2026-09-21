import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricValue } from '../../shared/domain/analyticsMetric';

export type MacroSharingReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributorCount: number;
  medianSharedPostedPersonalExpense: MetricValue | null;
  medianSharedPostedSettlementRequired: MetricValue | null;
  medianSharedPostedExpenseSharePercent: MetricValue | null;
  sharedPostedExpenseContributorPercent: MetricValue | null;
}>;
