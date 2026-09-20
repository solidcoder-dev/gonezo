import type { MetricId } from '../../../shared/domain/analyticsMetric';
import type { UserMetricResult } from '../../domain/userMetricResult';
import type { UserMetricCalculator } from './userMetricCalculator';
import type { UserMetricContext } from './userMetricContext';

export class CalculateUserMetrics {
  private readonly calculators: readonly UserMetricCalculator[];

  constructor(calculators: readonly UserMetricCalculator[]) {
    this.calculators = calculators;
  }

  execute(context: UserMetricContext, metricIds: readonly MetricId[]): readonly UserMetricResult[] {
    const calculatorsById = new Map(this.calculators.map((calculator) => [calculator.definition.id.toString(), calculator]));
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
}
