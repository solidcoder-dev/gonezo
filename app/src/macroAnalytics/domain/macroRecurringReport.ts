import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricValue } from '../../shared/domain/analyticsMetric';

export type MacroRecurringReport = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributorCount: number;
  medianPostedRecurringExpense: MetricValue | null;
  medianExpectedRecurringExpense: MetricValue | null;
  medianScheduledRecurringExpense: MetricValue | null;
  medianPostedRecurringExpenseSharePercent: MetricValue | null;
}>;
