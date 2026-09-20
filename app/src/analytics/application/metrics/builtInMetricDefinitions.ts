import { createMetricDefinition, MetricId, MetricKey, MetricVersion } from '../../../shared/domain/analyticsMetric';

function definition(key: string, valueKind: 'MONEY' | 'RATIO') {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

export const INCOME_TOTAL_V1 = definition('income_total', 'MONEY');
export const EXPENSE_TOTAL_V1 = definition('expense_total', 'MONEY');
export const NET_BALANCE_FLOW_V1 = definition('net_balance_flow', 'MONEY');
export const EXPENSE_CHANGE_PERCENT_V1 = definition('expense_change_percent', 'RATIO');
export const NET_BALANCE_FLOW_CHANGE_PERCENT_V1 = definition('net_balance_flow_change_percent', 'RATIO');
