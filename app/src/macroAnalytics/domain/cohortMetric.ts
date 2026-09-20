import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MetricDefinition, MetricId, MetricValue } from '../../shared/domain/analyticsMetric';
import type { ContributorMetricResult } from './contributorMetric';
import type { ContributionDimensions } from './contributionDimensions';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

export type CohortMetricResult = Readonly<{
  period: AnalyticsPeriod;
  cohort: Cohort;
  definition: MetricDefinition;
  value: MetricValue;
  contributorCount: number;
}>;

export type CohortMetricCalculator = Readonly<{
  definition: MetricDefinition;
  contributorMetricId?: string;
  calculate(input: Readonly<{
    contributors: readonly Readonly<{ result: ContributorMetricResult; dimensions: ContributionDimensions }> [];
    contributions: readonly MacroAnalyticsContribution[];
    currency: string;
  }>): Readonly<{ value: MetricValue; contributorCount: number }> | null;
}>;

export type CohortMetricRequest = Readonly<{
  period: AnalyticsPeriod;
  cohort: Cohort;
  currency: string;
  metricIds: readonly MetricId[];
}>;
