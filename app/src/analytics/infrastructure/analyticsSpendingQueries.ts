import {
  buildSpendingDashboard, buildSpendingOverview, buildSpendingTimeline, buildSpendingTopExpenses,
  buildSpendingTimelineWindow, buildAnalyticsOverviewWindows,
} from '../application/analyticsBuilders';
import {
  buildAnalyticsSpendingReport as buildReport,
  resolveAnalyticsSpendingWindow,
} from '../application/spendingReport';
import { buildSpendingTimeline as buildReportTimeline } from '../application/series/spendingTimeline';
import { buildSpendingCategories } from '../application/breakdowns/categorySpending';
import { buildSpendingMerchants } from '../application/rankings/merchantSpending';
import type {
  AnalyticsSpendingDashboardInput, AnalyticsSpendingDashboardResult, AnalyticsSpendingOverviewInput, AnalyticsSpendingOverviewResult,
  AnalyticsSpendingReport, AnalyticsSpendingReportInput, AnalyticsSpendingTimelineInput, AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesInput, AnalyticsSpendingTopExpensesResult, AnalyticsTopExpensesInput, AnalyticsTopExpensesResult,
} from '../application/analytics.port';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import { analyticsTransactionFilters, resolveAnalyticsQueryScope } from './analyticsQueryScope';
import { listAnalyticsMovements } from './analyticsMovementReader';
import {
  calculateSpendingReportMetrics, earliestTransactionDate, listAnalyticsCategoryReferences, listSpendingMovements,
  selectedCategoryMovements, spendingSelection, userMetricContext,
} from './analyticsQueryHelpers';

export async function analyticsGetSpendingReport(port: AnalyticsQueryPort, input: AnalyticsSpendingReportInput): Promise<AnalyticsSpendingReport> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const selection = spendingSelection(input);
  let earliestMovement: string | undefined;
  if (scope.filters.period.kind === 'allTime') {
    const all = await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, undefined, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode });
    earliestMovement = earliestTransactionDate(all.transactions)?.toISOString().slice(0, 10);
  }
  const window = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements);
  const previousWindow = scope.filters.period.kind !== 'allTime' ? resolveAnalyticsSpendingWindow({ ...selection, shift: selection.shift - 1 }, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements) : undefined;
  const [currentResult, previousResult, categories] = await Promise.all([
    listSpendingMovements(port, scope.filters, scope.selectedAccountIds, window),
    previousWindow ? listSpendingMovements(port, scope.filters, scope.selectedAccountIds, previousWindow) : Promise.resolve({ movements: [], transactions: [] }),
    listAnalyticsCategoryReferences(port),
  ]);
  const current = selectedCategoryMovements(currentResult.movements, input.categoryId);
  const previous = selectedCategoryMovements(previousResult.movements, input.categoryId);
  const currentMovementIds = new Set(current.map((movement) => movement.id));
  const previousMovementIds = new Set(previous.map((movement) => movement.id));
  const currency = input.currency.trim().toUpperCase();
  const reportMetrics = calculateSpendingReportMetrics(userMetricContext(currency, currentResult.transactions.filter((transaction) => currentMovementIds.has(transaction.id)), previousWindow ? previousResult.transactions.filter((transaction) => previousMovementIds.has(transaction.id)) : undefined), currency, Boolean(previousWindow));
  return buildReport({ window, previousWindow, currency: input.currency, ...reportMetrics, timeline: buildReportTimeline(current, window, input.currency.toUpperCase()), categories: buildSpendingCategories(current, window, input.currency.toUpperCase(), categories), merchants: buildSpendingMerchants(current, window, input.currency.toUpperCase()) });
}

export async function analyticsGetAnalyticsTopExpenses(port: AnalyticsQueryPort, input: AnalyticsTopExpensesInput): Promise<AnalyticsTopExpensesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const window = resolveAnalyticsSpendingWindow(spendingSelection(input), now.toISOString().slice(0, 10), undefined, scope.filters.includePlannedMovements);
  const [movementResult, categories] = await Promise.all([listSpendingMovements(port, scope.filters, scope.selectedAccountIds, window), listAnalyticsCategoryReferences(port)]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const items = movementResult.movements.filter((movement) => movement.type === 'expense').sort((left, right) => Number(right.amount) - Number(left.amount) || left.id.localeCompare(right.id));
  const offset = Math.max(0, Math.trunc(input.page?.offset ?? 0));
  const limit = input.page?.limit === undefined ? items.length : Math.max(0, Math.trunc(input.page.limit));
  return { window, totalCount: items.length, items: items.slice(offset, offset + limit).map((movement) => ({ movementId: movement.id, description: movement.description, merchant: movement.merchant, categoryId: movement.categoryId, categoryName: movement.categoryId ? categoryNames.get(movement.categoryId) : undefined, amount: { value: Number(movement.amount).toFixed(2), currency: input.currency.toUpperCase() }, occurredAt: movement.occurredAt })) };
}

export async function analyticsGetSpendingOverview(port: AnalyticsQueryPort, input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const allScoped = scope.filters.period.kind === 'allTime' ? await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, undefined, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }) : undefined;
  const currentWindow = buildSpendingTimelineWindow(scope.filters.period, now, input.periodOffset, allScoped ? earliestTransactionDate(allScoped.transactions) : undefined, 5, scope.filters.includePlannedMovements);
  const transactions = allScoped ? allScoped.transactions : (await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode })).transactions;
  const categories = await port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true });
  return buildSpendingOverview({ transactions, categories: categories.items, currency: input.currency, granularity: input.granularity, currentWindow });
}

export async function analyticsGetSpendingDashboard(port: AnalyticsQueryPort, input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);
  const [currentResult, previousResult, categories] = await Promise.all([
    listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }),
    windows.previousWindow ? listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows.previousWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }) : Promise.resolve({ accounts: [], transactions: [] }),
    port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true }),
  ]);
  return buildSpendingDashboard({ currentTransactions: currentResult.transactions, previousTransactions: previousResult.transactions, categories: categories.items, currency: input.currency, currentWindow: windows.currentWindow, previousWindow: windows.previousWindow });
}

export async function analyticsGetSpendingTimeline(port: AnalyticsQueryPort, input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const allPeriodMovements = scope.filters.period.kind === 'allTime' ? await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, undefined, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }) : undefined;
  const currentWindow = buildSpendingTimelineWindow(scope.filters.period, now, input.periodOffset, allPeriodMovements ? earliestTransactionDate(allPeriodMovements.transactions) : undefined, 5, scope.filters.includePlannedMovements);
  const transactions = allPeriodMovements ? allPeriodMovements.transactions : (await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode })).transactions;
  return buildSpendingTimeline({ transactions, currency: input.currency, currentWindow, period: scope.filters.period });
}

export async function analyticsGetSpendingTopExpenses(port: AnalyticsQueryPort, input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode });
  return buildSpendingTopExpenses({ transactions, currency: input.currency, currentWindow: windows.currentWindow });
}
