import type { MetricId } from '../../../shared/domain/analyticsMetric';
import type { UserMetricResult } from '../../domain/userMetricResult';
import { calculateUserMetrics, type UserMetricCalculator } from './userMetricCalculator';
import type { UserMetricContext } from './userMetricContext';

export class CalculateUserMetrics {
  private readonly calculators: readonly UserMetricCalculator[];

  constructor(calculators: readonly UserMetricCalculator[]) {
    this.calculators = calculators;
  }

  execute(context: UserMetricContext, metricIds: readonly MetricId[]): readonly UserMetricResult[] {
    return calculateUserMetrics(this.calculators, context, metricIds);
  }
}
