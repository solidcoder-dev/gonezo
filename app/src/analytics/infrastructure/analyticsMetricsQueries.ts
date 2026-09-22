import type { AnalyticsQueryMetricsInput, AnalyticsQueryMetricsResult } from '../application/analytics.port';
import { createAnalyticsQueryContext } from '../application/analyticsQueryContext';
import { analyticsReferenceDateFromNow } from '../application/analyticsFilters';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import { analyticsTransactionFilters, resolveAnalyticsQueryScope } from './analyticsQueryScope';
import { listAnalyticsMovements } from './analyticsMovementReader';
import { calculateUserMetrics, userMetricContext } from './analyticsQueryHelpers';

export async function analyticsQueryMetrics(port: AnalyticsQueryPort, input: AnalyticsQueryMetricsInput): Promise<AnalyticsQueryMetricsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const queryContext = createAnalyticsQueryContext({ filters: { ...scope.filters, period: periodSelection.period }, referenceDate: analyticsReferenceDateFromNow(), shift: periodSelection.shift });
  const currentWindow = queryContext.currentWindow ? { start: new Date(`${queryContext.currentWindow.from}T00:00:00.000Z`), end: new Date(`${queryContext.currentWindow.to}T00:00:00.000Z`) } : undefined;
  const comparisonWindow = queryContext.comparisonWindow ? { start: new Date(`${queryContext.comparisonWindow.from}T00:00:00.000Z`), end: new Date(`${queryContext.comparisonWindow.to}T00:00:00.000Z`) } : undefined;
  if (currentWindow) currentWindow.end.setUTCDate(currentWindow.end.getUTCDate() + 1);
  if (comparisonWindow) comparisonWindow.end.setUTCDate(comparisonWindow.end.getUTCDate() + 1);
  const movementScope = { accountIds: scope.selectedAccountIds, includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode } as const;
  const [current, comparison] = await Promise.all([
    listAnalyticsMovements(port, { ...movementScope, filters: analyticsTransactionFilters(scope.filters, currentWindow, true) }),
    comparisonWindow ? listAnalyticsMovements(port, { ...movementScope, filters: analyticsTransactionFilters(scope.filters, comparisonWindow, true) }) : Promise.resolve(undefined),
  ]);
  return { items: calculateUserMetrics.execute(userMetricContext(queryContext.currency, current.transactions, comparison?.transactions), input.metricIds) };
}
