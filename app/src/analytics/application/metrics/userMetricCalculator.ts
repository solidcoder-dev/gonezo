import type { MetricDefinition, MetricId } from '../../../shared/domain/analyticsMetric';
import type { UserMetricContext } from './userMetricContext';
import type { UserMetricResult } from '../../domain/userMetricResult';

export interface UserMetricCalculator {
  readonly definition: MetricDefinition;
  calculate(context: UserMetricContext): UserMetricResult | null;
}

export function calculateUserMetrics(
  calculators: readonly UserMetricCalculator[],
  context: UserMetricContext,
  metricIds: readonly MetricId[],
): readonly UserMetricResult[] {
  const calculatorsById = new Map(calculators.map((calculator) => [calculator.definition.id.toString(), calculator]));
  const requestedIds = new Set<string>();
  const results: UserMetricResult[] = [];

  for (const metricId of metricIds) {
    const key = metricId.toString();
    if (requestedIds.has(key)) continue;
    requestedIds.add(key);
    const calculator = calculatorsById.get(key);
    if (!calculator) throw new Error(`Unsupported user metric: ${key}`);
    const result = calculator.calculate(context);
    if (result) results.push(result);
  }
  return results;
}
