import type { MetricDefinition } from '../../../shared/domain/analyticsMetric';
import type { UserMetricContext } from './userMetricContext';
import type { UserMetricResult } from '../../domain/userMetricResult';

export interface UserMetricCalculator {
  readonly definition: MetricDefinition;
  calculate(context: UserMetricContext): UserMetricResult | null;
}
