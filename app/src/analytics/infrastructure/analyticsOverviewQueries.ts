import { buildAnalyticsOverviewInsights, buildAnalyticsOverviewSnapshot, buildAnalyticsOverviewWindows } from '../application/analyticsBuilders';
import { buildOverviewMovementHighlights } from '../application/highlights/overviewMovementHighlights';
import { buildOverviewTransferSummary } from '../application/summaries/overviewTransferSummary';
import type { AnalyticsOverviewInsightsInput, AnalyticsOverviewInsightsResult, AnalyticsOverviewSnapshotInput, AnalyticsOverviewSnapshotResult } from '../application/analytics.port';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import { analyticsTransactionFilters, resolveAnalyticsQueryScope } from './analyticsQueryScope';
import { listAnalyticsMovements } from './analyticsMovementReader';
import { analyticsGetOverviewRecurringInsight } from './overviewRecurringInsightQuery';
import { analyticsGetOverviewSharingInsights } from './overviewSharingInsightsQuery';
import { calculateUserMetrics, earliestTransactionDate, postedTransactionIds, userMetricContext } from './analyticsQueryHelpers';
import { EXPENSE_TOTAL_V1, INCOME_TOTAL_V1, NET_BALANCE_FLOW_CHANGE_PERCENT_V1, NET_BALANCE_FLOW_V1 } from '../application/metrics/builtInMetricDefinitions';

function overviewTotals(transactions: Awaited<ReturnType<typeof listAnalyticsMovements>>['transactions'], currency: string) {
  const metricResults = calculateUserMetrics.execute(userMetricContext(currency, transactions), [INCOME_TOTAL_V1.id, EXPENSE_TOTAL_V1.id, NET_BALANCE_FLOW_V1.id]);
  const amounts = new Map(metricResults.map((result) => [result.definition.id.toString(), result.value]));
  const income = amounts.get(INCOME_TOTAL_V1.id.toString());
  const expense = amounts.get(EXPENSE_TOTAL_V1.id.toString());
  const netFlow = amounts.get(NET_BALANCE_FLOW_V1.id.toString());
  if (income?.kind !== 'MONEY' || expense?.kind !== 'MONEY' || netFlow?.kind !== 'MONEY') throw new Error('Overview money metrics did not return money');
  return { incomeAmount: income.value.toFixed(2), expenseAmount: expense.value.toFixed(2), netFlowAmount: netFlow.value.toFixed(2), ...buildOverviewTransferSummary(transactions, currency) };
}

export async function analyticsGetOverviewSnapshot(port: AnalyticsQueryPort, input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const allTimeResult = scope.filters.period.kind === 'allTime' ? await listAnalyticsMovements(port, { accountIds, filters: analyticsTransactionFilters(scope.filters, undefined, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }) : undefined;
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, allTimeResult ? earliestTransactionDate(allTimeResult.transactions) : undefined, scope.filters.includePlannedMovements, periodSelection);
  const [currentResult, previousResult] = await Promise.all([
    allTimeResult ?? listAnalyticsMovements(port, { accountIds, filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }),
    windows.previousWindow ? listAnalyticsMovements(port, { accountIds, filters: analyticsTransactionFilters(scope.filters, windows.previousWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }) : Promise.resolve({ accounts: [], transactions: [] }),
  ]);
  const currency = input.currency.trim().toUpperCase();
  const comparisonMetricContext = userMetricContext(currency, currentResult.transactions, previousResult.transactions);
  const netFlowChange = windows.previousWindow ? calculateUserMetrics.execute(comparisonMetricContext, [NET_BALANCE_FLOW_CHANGE_PERCENT_V1.id])[0] : undefined;
  return buildAnalyticsOverviewSnapshot({ currentWindow: windows.currentWindow, previousWindow: windows.previousWindow, currentTotals: overviewTotals(currentResult.transactions, currency), previousTotals: windows.previousWindow ? overviewTotals(previousResult.transactions, currency) : undefined, netFlowChangePercent: netFlowChange?.value.kind === 'RATIO' ? netFlowChange.value.value.toFixed(2) : undefined, ...buildOverviewMovementHighlights(currentResult.transactions, currency) });
}

export async function analyticsGetOverviewInsights(port: AnalyticsQueryPort, input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements, periodSelection);
  const { transactions } = await listAnalyticsMovements(port, { accountIds, filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode });
  const transactionIds = postedTransactionIds(transactions);
  const [taxonomyAssignments, tags, sharingInsights, recurringInsight] = await Promise.all([
    transactionIds.length > 0 ? port.orchestrationListTransactionTaxonomy({ transactionIds }) : Promise.resolve({ items: [] }),
    port.taxonomyListTags({ includeArchived: false }),
    analyticsGetOverviewSharingInsights(port, transactions, scope.filters.sharedAmountMode),
    analyticsGetOverviewRecurringInsight(port, { accountIds, filters: scope.filters, window: windows.currentWindow }),
  ]);
  return buildAnalyticsOverviewInsights({ topTagsFact: { transactions, taxonomyAssignments: taxonomyAssignments.items, tags: tags.items }, sharingInsights, recurringInsight, transferTransactions: transactions, currency: input.currency });
}
