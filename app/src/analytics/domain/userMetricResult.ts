import type { MetricDefinition, MetricValue } from '../../shared/domain/analyticsMetric';

export type UserMetricResult = Readonly<{
  definition: MetricDefinition;
  value: MetricValue;
}>;

export function createUserMetricResult(
  definition: MetricDefinition,
  value: MetricValue,
): UserMetricResult {
  if (definition.valueKind !== value.kind) {
    throw new Error(`Metric value kind ${value.kind} does not match definition kind ${definition.valueKind}`);
  }
  return Object.freeze({ definition, value });
}
