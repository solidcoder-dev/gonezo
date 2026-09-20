import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricDefinition, MetricId, MetricValue } from '../../shared/domain/analyticsMetric';

export type CohortMetricResult = Readonly<{
  period: AnalyticsPeriod;
  cohort: Cohort;
  definition: MetricDefinition;
  value: MetricValue;
  contributorCount: number;
}>;

export type CohortMetricCalculator = Readonly<{
  definition: MetricDefinition;
  contributorMetricId: string;
  calculate(values: readonly MetricValue[], currency?: string): Readonly<{ value: MetricValue; contributorCount: number }> | null;
}>;

export type CohortMetricRequest = Readonly<{
  period: AnalyticsPeriod;
  cohort: Cohort;
  currency: string;
  metricIds: readonly MetricId[];
}>;
