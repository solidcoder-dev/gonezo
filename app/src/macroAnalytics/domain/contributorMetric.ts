import type { AnalyticsContributorId } from './analyticsContributorId';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import type { MetricDefinition, MetricId, MetricValue } from '../../shared/domain/analyticsMetric';

export type ContributorMetricResult = Readonly<{
  contributorId: AnalyticsContributorId;
  period: AnalyticsPeriod;
  definition: MetricDefinition;
  value: MetricValue;
}>;

export type ContributorMetricCalculator = Readonly<{
  definition: MetricDefinition;
  calculate(contribution: MacroAnalyticsContribution, currency?: string): MetricValue | null;
}>;

export type ContributorMetricCalculationInput = Readonly<{
  contributorId: AnalyticsContributorId;
  contribution: MacroAnalyticsContribution;
  currency?: string;
  metricIds: readonly MetricId[];
}>;

export function createContributorMetricResult(
  contributorId: AnalyticsContributorId,
  period: AnalyticsPeriod,
  definition: MetricDefinition,
  value: MetricValue,
): ContributorMetricResult {
  if (definition.valueKind !== value.kind) throw new Error(`Metric ${definition.id.toString()} returned ${value.kind}; expected ${definition.valueKind}`);
  return Object.freeze({ contributorId, period, definition, value });
}
