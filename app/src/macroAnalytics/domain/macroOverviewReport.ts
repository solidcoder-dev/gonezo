import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricValue } from '../../shared/domain/analyticsMetric';

export type MacroOverviewReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributorCount: number;
  medianPostedIncome: MetricValue | null;
  medianPostedExpense: MetricValue | null;
  medianExpectedExpense: MetricValue | null;
  medianScheduledExpense: MetricValue | null;
}>;
