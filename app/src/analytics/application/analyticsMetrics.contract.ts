import type { MetricId } from '../../shared/domain/analyticsMetric';
import type { UserMetricResult } from '../domain/userMetricResult';
import type { AnalyticsCurrencyScopeInput } from './analyticsCommon.contract';

export type AnalyticsQueryMetricsInput = AnalyticsCurrencyScopeInput & { metricIds: readonly MetricId[] };
export type AnalyticsQueryMetricsResult = { items: readonly UserMetricResult[] };
