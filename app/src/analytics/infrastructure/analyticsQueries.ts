import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import { balanceImpact } from '../../ledger/application/movementSemantics';
import type { LedgerGetAccountSummaryResult, LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import {
  buildAnalyticsCashFlowSummary,
  buildFlowInsights,
  buildFlowProjection,
  buildAnalyticsOverviewInsights,
  buildAnalyticsOverviewSnapshot,
  buildAnalyticsOverviewWindows,
  buildSpendingTimelineWindow,
  buildSpendingDashboard,
  buildSpendingOverview,
  buildSpendingTimeline,
  buildSpendingTopExpenses,
  listAnalyticsCurrencies,
} from '../application/analyticsBuilders';
import {
  buildAnalyticsFlowReport,
  type AnalyticsFlowFact,
} from '../application/analyticsFlowReport';
import { buildFlowProjection as calculateFlowProjection } from '../application/series/flowProjection';
import { calculateFlowSummary } from '../application/series/flowSummary';
import { calculateUpcomingFlow } from '../application/readModels/flowUpcoming';
import { buildFlowInsights as calculateFlowInsights } from '../application/insights/flowInsights';
import {
  buildAnalyticsSpendingReport,
  normalizeAnalyticsPeriodSelection,
  resolveAnalyticsSpendingWindow,
  type AnalyticsCategoryReference,
  type AnalyticsPeriodSelection,
  type AnalyticsSpendingMovement,
  type AnalyticsSpendingPeriodWindow,
} from '../application/spendingReport';
import { buildSpendingTimeline as buildSpendingReportTimeline } from '../application/series/spendingTimeline';
import { buildSpendingCategories as buildSpendingReportCategories } from '../application/breakdowns/categorySpending';
import { buildSpendingMerchants as buildSpendingReportMerchants } from '../application/rankings/merchantSpending';
import {
  EXPENSE_CHANGE_PERCENT_V1,
  EXPENSE_TOTAL_V1,
  INCOME_TOTAL_V1,
  NET_BALANCE_FLOW_CHANGE_PERCENT_V1,
  NET_BALANCE_FLOW_V1,
} from '../application/metrics/builtInMetricDefinitions';
import type { UserMetricContext } from '../application/metrics/userMetricContext';
import type { AnalyticsMoneyDto } from '../application/spendingReport';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { buildOverviewMovementHighlights } from '../application/highlights/overviewMovementHighlights';
import { buildOverviewTransferSummary } from '../application/summaries/overviewTransferSummary';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsCurrencyScopeInput,
  AnalyticsQueryMetricsInput,
  AnalyticsQueryMetricsResult,
  AnalyticsFlowInsightsInput,
  AnalyticsFlowInsightsResult,
  AnalyticsFlowProjectionInput,
  AnalyticsFlowProjectionResult,
  AnalyticsFlowUpcomingInput,
  AnalyticsFlowUpcomingResult,
  AnalyticsGetFilterFacetsInput,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
  AnalyticsOverviewInsightsInput,
  AnalyticsOverviewInsightsResult,
  AnalyticsOverviewSnapshotInput,
  AnalyticsOverviewSnapshotResult,
  AnalyticsSpendingReport,
  AnalyticsSpendingDashboardInput,
  AnalyticsSpendingDashboardResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
  AnalyticsSpendingTimelineInput,
  AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesInput,
  AnalyticsSpendingTopExpensesResult,
  AnalyticsSpendingReportInput,
  AnalyticsTopExpensesInput,
  AnalyticsTopExpensesResult,
  AnalyticsFlowReportInput,
  AnalyticsFlowReport,
} from '../application/analytics.port';
import { type AnalyticsFilters } from '../application/analyticsFilters';
import { listAnalyticsMovements, type AnalyticsTransactionReadModel } from './analyticsMovementReader';
import {
  type AnalyticsQueryPort,
  listScopedAnalyticsMovements,
  resolveAnalyticsQueryScope,
  analyticsTransactionFilters,
} from './analyticsQueryScope';
export type { AnalyticsQueryPort } from './analyticsQueryScope';
import { analyticsGetOverviewRecurringInsight } from './overviewRecurringInsightQuery';
import { analyticsGetOverviewSharingInsights } from './overviewSharingInsightsQuery';
import { createAnalyticsQueryContext } from '../application/analyticsQueryContext';
import { analyticsReferenceDateFromNow } from '../application/analyticsFilters';
import { CalculateUserMetrics } from '../application/metrics/calculateUserMetrics';
import { userMetricCalculators } from '../application/metrics/financialMetricCalculators';
import { isAnalyticsCashFlowTransaction } from '../application/analyticsMovementEligibility';

const calculateUserMetrics = new CalculateUserMetrics(userMetricCalculators);

async function listAnalyticsCategoryReferences(port: AnalyticsQueryPort): Promise<AnalyticsCategoryReference[]> {
  if (port.analyticsListCategories) {
    return (await port.analyticsListCategories()).items;
  }
  return (await port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true })).items.map((category) => ({
    id: category.id,
    name: category.name,
  }));
}

function spendingMovement(transaction: Awaited<ReturnType<typeof listAnalyticsMovements>>['transactions'][number]): AnalyticsSpendingMovement {
  return {
    id: transaction.id,
    occurredAt: transaction.occurredAt,
    type: transaction.type === 'transfer' ? 'transfer_out' : transaction.type,
    currency: transaction.currency,
    amount: transaction.analyticsAmount,
    categoryId: transaction.categoryId,
    categoryName: transaction.category?.name,
    description: transaction.description,
    merchant: transaction.merchant,
    merchantReference: transaction.merchantReference,
    items: transaction.items.map((item) => ({ amount: item.amount, categoryId: item.categoryId, categoryName: item.note })),
  };
}

function spendingSelection(input: AnalyticsSpendingReportInput | AnalyticsTopExpensesInput): AnalyticsPeriodSelection {
  return normalizeAnalyticsPeriodSelection(input.periodSelection);
}

function selectedCategoryMovements(movements: AnalyticsSpendingMovement[], categoryId?: string): AnalyticsSpendingMovement[] {
  if (!categoryId) return movements;
  return movements.filter((movement) => categoryId === 'uncategorized' ? !movement.categoryId : movement.categoryId === categoryId);
}

function userMetricContext(
  currency: string,
  currentTransactions: AnalyticsTransactionReadModel[],
  comparisonTransactions?: AnalyticsTransactionReadModel[],
): UserMetricContext {
  const factsFrom = (transactions: AnalyticsTransactionReadModel[]) => transactions
    .filter((transaction): transaction is typeof transaction & { type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' } =>
      isAnalyticsCashFlowTransaction(transaction, currency)
      && (transaction.type === 'income' || transaction.type === 'expense' || transaction.type === 'transfer_in' || transaction.type === 'transfer_out'))
    .map((transaction) => ({ type: transaction.type, amount: transaction.analyticsAmount }));
  return {
    currency,
    currentPeriodFacts: factsFrom(currentTransactions),
    comparisonPeriodFacts: comparisonTransactions ? factsFrom(comparisonTransactions) : undefined,
  };
}

function spendingMetricMoney(value: ExactDecimal, currency: string): AnalyticsMoneyDto {
  return { value: value.toFixed(2), currency };
}

function calculateSpendingReportMetrics(
  context: UserMetricContext,
  currency: string,
  hasPreviousWindow: boolean,
): { totalExpense: AnalyticsMoneyDto; previousExpense?: AnalyticsMoneyDto; changePercent?: number } {
  const current = calculateUserMetrics.execute(context, [EXPENSE_TOTAL_V1.id])[0];
  const previous = hasPreviousWindow
    ? calculateUserMetrics.execute({ currency, currentPeriodFacts: context.comparisonPeriodFacts ?? [] }, [EXPENSE_TOTAL_V1.id])[0]
    : undefined;
  const change = hasPreviousWindow
    ? calculateUserMetrics.execute(context, [EXPENSE_CHANGE_PERCENT_V1.id])[0]
    : undefined;
  if (!current || current.value.kind !== 'MONEY') throw new Error('Expense total metric did not return money');
  if (previous && previous.value.kind !== 'MONEY') throw new Error('Previous expense total metric did not return money');
  return {
    totalExpense: spendingMetricMoney(current.value.value, currency),
    previousExpense: previous?.value.kind === 'MONEY' ? spendingMetricMoney(previous.value.value, currency) : undefined,
    changePercent: change?.value.kind === 'RATIO' ? Number(change.value.value.toString()) : undefined,
  };
}

function overviewTotals(transactions: AnalyticsTransactionReadModel[], currency: string) {
  const metricResults = calculateUserMetrics.execute(userMetricContext(currency, transactions), [
    INCOME_TOTAL_V1.id,
    EXPENSE_TOTAL_V1.id,
    NET_BALANCE_FLOW_V1.id,
  ]);
  const amounts = new Map(metricResults.map((result) => [result.definition.id.toString(), result.value]));
  const income = amounts.get(INCOME_TOTAL_V1.id.toString());
  const expense = amounts.get(EXPENSE_TOTAL_V1.id.toString());
  const netFlow = amounts.get(NET_BALANCE_FLOW_V1.id.toString());
  if (income?.kind !== 'MONEY' || expense?.kind !== 'MONEY' || netFlow?.kind !== 'MONEY') {
    throw new Error('Overview money metrics did not return money');
  }
  return {
    incomeAmount: income.value.toFixed(2),
    expenseAmount: expense.value.toFixed(2),
    netFlowAmount: netFlow.value.toFixed(2),
    ...buildOverviewTransferSummary(transactions, currency),
  };
}

async function listSpendingMovements(
  port: AnalyticsQueryPort,
  filters: AnalyticsFilters,
  accountIds: string[],
  window: AnalyticsSpendingPeriodWindow,
): Promise<{ movements: AnalyticsSpendingMovement[]; transactions: Awaited<ReturnType<typeof listAnalyticsMovements>>['transactions'] }> {
  const result = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(filters, {
      start: new Date(`${window.start}T00:00:00.000Z`),
      end: new Date(`${window.endExclusive}T00:00:00.000Z`),
    }, true),
    includeIgnoredMovements: filters.includeIgnoredMovements,
    sharedAmountMode: filters.sharedAmountMode,
  });
  return { movements: result.transactions.map(spendingMovement), transactions: result.transactions };
}

function earliestTransactionDate(transactions: Array<{ occurredAt: string }>): Date | undefined {
  return transactions.reduce<Date | undefined>((earliest, transaction) => {
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return earliest;
    }
    return !earliest || occurredAt < earliest ? occurredAt : earliest;
  }, undefined);
}

function postedTransactionIds(transactions: Array<{ id: string; reference?: { source: string; transactionId?: string } }>): string[] {
  return transactions
    .filter((transaction) => transaction.reference?.source === 'posted')
    .map((transaction) => transaction.reference?.transactionId)
    .filter((id): id is string => Boolean(id));
}

export async function analyticsListCurrencies(port: AnalyticsQueryPort): Promise<AnalyticsListCurrenciesResult> {
  const [accounts, preferences] = await Promise.all([
    port.ledgerListAccounts(),
    port.preferencesGet(),
  ]);
  const preferredAccount = preferences.defaultAccountId
    ? accounts.items.find((account) => account.id === preferences.defaultAccountId)
    : accounts.items[0];
  return { items: listAnalyticsCurrencies(accounts.items, preferredAccount?.currency) };
}

export async function analyticsGetSpendingReport(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingReportInput,
): Promise<AnalyticsSpendingReport> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const selection = spendingSelection(input);
  let earliestMovement: string | undefined;
  if (scope.filters.period.kind === 'allTime') {
    const all = await listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, undefined, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: scope.filters.sharedAmountMode,
    });
    earliestMovement = earliestTransactionDate(all.transactions)?.toISOString().slice(0, 10);
  }
  const window = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements);
  const previousWindow = scope.filters.period.kind !== 'allTime'
    ? resolveAnalyticsSpendingWindow({ ...selection, shift: selection.shift - 1 }, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements)
    : undefined;
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
  const reportMetrics = calculateSpendingReportMetrics(userMetricContext(
    currency,
    currentResult.transactions.filter((transaction) => currentMovementIds.has(transaction.id)),
    previousWindow ? previousResult.transactions.filter((transaction) => previousMovementIds.has(transaction.id)) : undefined,
  ), currency, Boolean(previousWindow));
  return buildAnalyticsSpendingReport({
    window,
    previousWindow,
    currency: input.currency,
    ...reportMetrics,
    timeline: buildSpendingReportTimeline(current, window, input.currency.toUpperCase()),
    categories: buildSpendingReportCategories(current, window, input.currency.toUpperCase(), categories),
    merchants: buildSpendingReportMerchants(current, window, input.currency.toUpperCase()),
  });
}

export async function analyticsGetAnalyticsTopExpenses(
  port: AnalyticsQueryPort,
  input: AnalyticsTopExpensesInput,
): Promise<AnalyticsTopExpensesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const selection = spendingSelection(input);
  const window = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), undefined, scope.filters.includePlannedMovements);
  const [movementResult, categories] = await Promise.all([
    listSpendingMovements(port, scope.filters, scope.selectedAccountIds, window),
    listAnalyticsCategoryReferences(port),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const items = movementResult.movements
    .filter((movement) => movement.type === 'expense')
    .sort((left, right) => Number(right.amount) - Number(left.amount) || left.id.localeCompare(right.id));
  const offset = Math.max(0, Math.trunc(input.page?.offset ?? 0));
  const limit = input.page?.limit === undefined ? items.length : Math.max(0, Math.trunc(input.page.limit));
  return {
    window,
    totalCount: items.length,
    items: items.slice(offset, offset + limit).map((movement) => ({
      movementId: movement.id,
      description: movement.description,
      merchant: movement.merchant,
      categoryId: movement.categoryId,
      categoryName: movement.categoryId ? categoryNames.get(movement.categoryId) : undefined,
      amount: { value: Number(movement.amount).toFixed(2), currency: input.currency.toUpperCase() },
      occurredAt: movement.occurredAt,
    })),
  };
}

export async function analyticsGetFilterFacets(
  port: AnalyticsQueryPort,
  input: AnalyticsGetFilterFacetsInput = {},
): Promise<AnalyticsGetFilterFacetsResult> {
  const scope = await resolveAnalyticsQueryScope(port, input.filters);
  const now = new Date();
  const currentWindow = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements).currentWindow;
  const [{ transactions }, tags] = await Promise.all([
    listScopedAnalyticsMovements(port, scope.filters, currentWindow, false),
    port.taxonomyListTags({ includeArchived: false }),
  ]);

  const transactionIds = postedTransactionIds(transactions);
  const taxonomy = transactionIds.length > 0
    ? await port.orchestrationListTransactionTaxonomy({ transactionIds })
    : { items: [] };
  const selectedTagIds = new Set(scope.filters.tagIds);
  const scopedTagIds = new Set<string>(selectedTagIds);
  for (const item of taxonomy.items) {
    for (const tagId of item.tagIds ?? []) {
      scopedTagIds.add(tagId);
    }
  }

  return {
    accounts: scope.compatibleAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
    })),
    tags: tags.items
      .filter((tag) => scopedTagIds.has(tag.id))
      .map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

export async function analyticsGetCashFlowSeries(
  port: AnalyticsQueryPort,
  input: AnalyticsCashFlowSeriesInput,
): Promise<LedgerGetCashFlowSeriesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const currentWindow = scope.filters.period.kind === 'allTime'
    ? undefined
    : buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements).currentWindow;
  const { accounts, transactions } = await listScopedAnalyticsMovements(port, scope.filters, currentWindow);
  return buildCashFlowSeries({
    accounts,
    transactions,
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    periodCount: 5,
    visibleRangeStart: currentWindow?.start ?? earliestTransactionDate(transactions),
    now,
  });
}

export async function analyticsGetPeriodCashFlowSummary(
  port: AnalyticsQueryPort,
  input: AnalyticsCurrencyScopeInput,
): Promise<AnalyticsCashFlowSummaryResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const currentWindow = scope.filters.period.kind === 'allTime'
    ? undefined
    : buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements).currentWindow;
  const { transactions } = await listScopedAnalyticsMovements(port, scope.filters, currentWindow);
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsQueryMetrics(
  port: AnalyticsQueryPort,
  input: AnalyticsQueryMetricsInput,
): Promise<AnalyticsQueryMetricsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const queryContext = createAnalyticsQueryContext({
    filters: { ...scope.filters, period: periodSelection.period },
    referenceDate: analyticsReferenceDateFromNow(),
    shift: periodSelection.shift,
  });
  const currentWindow = queryContext.currentWindow
    ? { start: new Date(`${queryContext.currentWindow.from}T00:00:00.000Z`), end: new Date(`${queryContext.currentWindow.to}T00:00:00.000Z`) }
    : undefined;
  const comparisonWindow = queryContext.comparisonWindow
    ? { start: new Date(`${queryContext.comparisonWindow.from}T00:00:00.000Z`), end: new Date(`${queryContext.comparisonWindow.to}T00:00:00.000Z`) }
    : undefined;
  if (currentWindow) currentWindow.end.setUTCDate(currentWindow.end.getUTCDate() + 1);
  if (comparisonWindow) comparisonWindow.end.setUTCDate(comparisonWindow.end.getUTCDate() + 1);
  const movementScope = {
    accountIds: scope.selectedAccountIds,
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  } as const;
  const [current, comparison] = await Promise.all([
    listAnalyticsMovements(port, { ...movementScope, filters: analyticsTransactionFilters(scope.filters, currentWindow, true) }),
    comparisonWindow
      ? listAnalyticsMovements(port, { ...movementScope, filters: analyticsTransactionFilters(scope.filters, comparisonWindow, true) })
      : Promise.resolve(undefined),
  ]);
  return {
    items: calculateUserMetrics.execute(userMetricContext(queryContext.currency, current.transactions, comparison?.transactions), input.metricIds),
  };
}

export async function analyticsGetOverviewSnapshot(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewSnapshotInput,
): Promise<AnalyticsOverviewSnapshotResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const allTimeResult = scope.filters.period.kind === 'allTime'
    ? await listAnalyticsMovements(port, {
        accountIds,
        filters: analyticsTransactionFilters(scope.filters, undefined, true),
        includeIgnoredMovements: scope.filters.includeIgnoredMovements,
        sharedAmountMode: scope.filters.sharedAmountMode,
      })
    : undefined;
  const windows = buildAnalyticsOverviewWindows(
    scope.filters.period,
    now,
    allTimeResult ? earliestTransactionDate(allTimeResult.transactions) : undefined,
    scope.filters.includePlannedMovements,
    periodSelection,
  );

  const [currentResult, previousResult] = await Promise.all([
    allTimeResult ?? listAnalyticsMovements(port, {
      accountIds,
      filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: scope.filters.sharedAmountMode,
    }),
    windows.previousWindow
      ? listAnalyticsMovements(port, {
          accountIds,
          filters: analyticsTransactionFilters(scope.filters, windows.previousWindow, true),
          includeIgnoredMovements: scope.filters.includeIgnoredMovements,
          sharedAmountMode: scope.filters.sharedAmountMode,
        })
      : Promise.resolve({ accounts: [], transactions: [] }),
  ]);

  const currency = input.currency.trim().toUpperCase();
  const comparisonMetricContext = userMetricContext(currency, currentResult.transactions, previousResult.transactions);
  const netFlowChange = windows.previousWindow
    ? calculateUserMetrics.execute(comparisonMetricContext, [NET_BALANCE_FLOW_CHANGE_PERCENT_V1.id])[0]
    : undefined;
  const currentTotals = overviewTotals(currentResult.transactions, currency);
  const previousTotals = windows.previousWindow ? overviewTotals(previousResult.transactions, currency) : undefined;
  return buildAnalyticsOverviewSnapshot({
    currentWindow: windows.currentWindow,
    previousWindow: windows.previousWindow,
    currentTotals,
    previousTotals,
    netFlowChangePercent: netFlowChange?.value.kind === 'RATIO' ? netFlowChange.value.value.toFixed(2) : undefined,
    ...buildOverviewMovementHighlights(currentResult.transactions, currency),
  });
}

export async function analyticsGetOverviewInsights(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewInsightsInput,
): Promise<AnalyticsOverviewInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const periodSelection = input.periodSelection ?? { period: scope.filters.period, shift: 0 };
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements, periodSelection);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });
  const transactionIds = postedTransactionIds(transactions);
  const [taxonomyAssignments, tags, sharingInsights, recurringInsight] = await Promise.all([
    transactionIds.length > 0
      ? port.orchestrationListTransactionTaxonomy({ transactionIds })
      : Promise.resolve({ items: [] }),
    port.taxonomyListTags({ includeArchived: false }),
    analyticsGetOverviewSharingInsights(port, transactions, scope.filters.sharedAmountMode),
    analyticsGetOverviewRecurringInsight(port, {
      accountIds,
      filters: scope.filters,
      window: windows.currentWindow,
    }),
  ]);

  return buildAnalyticsOverviewInsights({
    topTagsFact: {
      transactions,
      taxonomyAssignments: taxonomyAssignments.items,
      tags: tags.items,
    },
    sharingInsights,
    recurringInsight,
    transferTransactions: transactions,
    currency: input.currency,
  });
}

export async function analyticsGetSpendingOverview(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingOverviewInput,
): Promise<AnalyticsSpendingOverviewResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const allScoped = scope.filters.period.kind === 'allTime'
    ? await listAnalyticsMovements(port, {
        accountIds: scope.selectedAccountIds,
        filters: analyticsTransactionFilters(scope.filters, undefined, true),
        includeIgnoredMovements: scope.filters.includeIgnoredMovements,
        sharedAmountMode: scope.filters.sharedAmountMode,
      })
    : undefined;
  const currentWindow = buildSpendingTimelineWindow(
    scope.filters.period,
    now,
    input.periodOffset,
    allScoped ? earliestTransactionDate(allScoped.transactions) : undefined,
    5,
    scope.filters.includePlannedMovements,
  );
  const transactions = allScoped
    ? allScoped.transactions
    : (await listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, currentWindow, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: scope.filters.sharedAmountMode,
    })).transactions;
  const categories = await port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true });
  return buildSpendingOverview({
    transactions,
    categories: categories.items,
    currency: input.currency,
    granularity: input.granularity,
    currentWindow,
  });
}

export async function analyticsGetSpendingDashboard(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingDashboardInput,
): Promise<AnalyticsSpendingDashboardResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);
  const [currentResult, previousResult, categories] = await Promise.all([
    listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: scope.filters.sharedAmountMode,
    }),
    windows.previousWindow
      ? listAnalyticsMovements(port, {
          accountIds: scope.selectedAccountIds,
          filters: analyticsTransactionFilters(scope.filters, windows.previousWindow, true),
          includeIgnoredMovements: scope.filters.includeIgnoredMovements,
          sharedAmountMode: scope.filters.sharedAmountMode,
        })
      : Promise.resolve({ accounts: [], transactions: [] }),
    port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true }),
  ]);

  return buildSpendingDashboard({
    currentTransactions: currentResult.transactions,
    previousTransactions: previousResult.transactions,
    categories: categories.items,
    currency: input.currency,
    currentWindow: windows.currentWindow,
    previousWindow: windows.previousWindow,
  });
}

export async function analyticsGetSpendingTimeline(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingTimelineInput,
): Promise<AnalyticsSpendingTimelineResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const allPeriodMovements = scope.filters.period.kind === 'allTime'
    ? await listAnalyticsMovements(port, {
        accountIds: scope.selectedAccountIds,
        filters: analyticsTransactionFilters(scope.filters, undefined, true),
        includeIgnoredMovements: scope.filters.includeIgnoredMovements,
        sharedAmountMode: scope.filters.sharedAmountMode,
      })
    : undefined;
  const currentWindow = buildSpendingTimelineWindow(
    scope.filters.period,
    now,
    input.periodOffset,
    allPeriodMovements ? earliestTransactionDate(allPeriodMovements.transactions) : undefined,
    5,
    scope.filters.includePlannedMovements,
  );
  const transactions = allPeriodMovements
    ? allPeriodMovements.transactions
    : (await listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, currentWindow, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: scope.filters.sharedAmountMode,
    })).transactions;

  return buildSpendingTimeline({
    transactions,
    currency: input.currency,
    currentWindow,
    period: scope.filters.period,
  });
}

export async function analyticsGetSpendingTopExpenses(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingTopExpensesInput,
): Promise<AnalyticsSpendingTopExpensesResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });

  return buildSpendingTopExpenses({
    transactions,
    currency: input.currency,
    currentWindow: windows.currentWindow,
  });
}

async function selectedAccountSummaries(
  port: AnalyticsQueryPort,
  accountIds: string[],
): Promise<LedgerGetAccountSummaryResult[]> {
  return Promise.all(accountIds.map((accountId) => port.ledgerGetAccountSummary({ accountId })));
}

export async function analyticsGetFlowProjection(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowProjectionInput,
): Promise<AnalyticsFlowProjectionResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, input.periodOffset, undefined, 5, scope.filters.includePlannedMovements);
  const [balances, transactions, scheduledResults] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, windows, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: 'full',
    }),
    Promise.all(scope.selectedAccountIds.map((accountId) => port.schedulingListMovements({ sourceAccountId: accountId }))),
  ]);
  const scheduledMovements = scheduledResults.flatMap((result) => result.items);

  const currentBalanceAmount = balances.reduce(
    (total, account) => total.add(ExactDecimal.from(account.balanceAmount)),
    ExactDecimal.from('0'),
  ).toFixed(2);

  return buildFlowProjection({
    currency: input.currency,
    currentWindow: windows,
    period: scope.filters.period,
    currentBalanceAmount,
    postedTransactions: transactions.transactions,
    scheduledMovements,
    now,
  });
}

function flowFact(transaction: Awaited<ReturnType<typeof listAnalyticsMovements>>['transactions'][number], currency: string, amountMode: 'personal' | 'full'): AnalyticsFlowFact | undefined {
  const source = transaction.reference?.source;
  if (!source || transaction.type === 'transfer') return undefined;
  return { id: transaction.analyticsFactId ?? transaction.id, source, effectiveAt: transaction.occurredAt, accountId: transaction.accountId, type: transaction.type, amount: { value: amountMode === 'full' ? transaction.analyticsFullAmount : transaction.analyticsPersonalAmount, currency } };
}

function scheduledFlowFacts(
  movements: SchedulingMovementItem[],
  selectedAccountIds: Set<string>,
  currency: string,
  now: string,
): AnalyticsFlowFact[] {
  return movements.flatMap((movement) => {
    if (movement.status !== 'active' || movement.currency.trim().toUpperCase() !== currency) return [];
    const effectiveAt = movement.nextDueAt ?? movement.startAt;
    if (!effectiveAt || effectiveAt < now) return [];
    const facts: AnalyticsFlowFact[] = [];
    if (selectedAccountIds.has(movement.sourceAccountId)) {
      facts.push({
        id: `scheduled/${movement.id}/out/${effectiveAt}`,
        source: 'scheduledProjection',
        effectiveAt,
        accountId: movement.sourceAccountId,
        type: movement.type === 'transfer' ? 'transfer_out' : movement.type,
        amount: { value: movement.amount, currency },
      });
    }
    if (movement.type === 'transfer' && movement.targetAccountId && selectedAccountIds.has(movement.targetAccountId)) {
      facts.push({
        id: `scheduled/${movement.id}/in/${effectiveAt}`,
        source: 'scheduledProjection',
        effectiveAt,
        accountId: movement.targetAccountId,
        type: 'transfer_in',
        amount: { value: movement.destinationAmount ?? movement.amount, currency: movement.destinationCurrency?.trim().toUpperCase() ?? currency },
      });
    }
    return facts;
  });
}

export async function analyticsGetFlowReport(port: AnalyticsQueryPort, input: AnalyticsFlowReportInput): Promise<AnalyticsFlowReport> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  if (scope.selectedAccountIds.length === 0) throw new Error('No compatible accounts for this currency');
  const now = new Date();
  const selection = normalizeAnalyticsPeriodSelection(input.periodSelection);
  const balanceMovementsPromise = listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, undefined, false),
    includeIgnoredMovements: true,
    sharedAmountMode: 'full',
  });
  const balanceHistory = selection.period.kind === 'allTime' ? await balanceMovementsPromise : undefined;
  const earliestMovement = balanceHistory ? earliestTransactionDate(balanceHistory.transactions)?.toISOString().slice(0, 10) : undefined;
  const resolvedWindow = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), earliestMovement, scope.filters.includePlannedMovements);
  const window = selection.period.kind === 'allTime' && earliestMovement
    ? { ...resolvedWindow, start: `${new Date(`${earliestMovement}T00:00:00.000Z`).getUTCFullYear()}-01-01`, canGoPrevious: false }
    : resolvedWindow;
  const windowDates = { start: new Date(`${window.start}T00:00:00.000Z`), end: new Date(`${window.endExclusive}T00:00:00.000Z`) };
  const [accounts, balanceMovements, selectedMovements, scheduledResults] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    balanceHistory ?? balanceMovementsPromise,
    listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windowDates, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }),
    scope.filters.includePlannedMovements
      ? Promise.all(scope.compatibleAccounts.map((account) => port.schedulingListMovements({ sourceAccountId: account.id })))
      : Promise.resolve([]),
  ]);
  const currency = input.currency.trim().toUpperCase();
  const currentBalance = accounts.reduce((sum, account) => sum.add(ExactDecimal.from(account.balanceAmount)), ExactDecimal.from('0'));
  const postedBalanceFacts = balanceMovements.transactions.map((transaction) => flowFact(transaction, currency, 'full')).filter((fact): fact is AnalyticsFlowFact => Boolean(fact && fact.source === 'posted' && fact.effectiveAt >= `${window.start}T00:00:00.000Z` && fact.effectiveAt < now.toISOString()));
  const windowBalanceImpact = postedBalanceFacts.reduce((sum, fact) => sum.add(ExactDecimal.from(balanceImpact(fact.type, fact.amount.value))), ExactDecimal.from('0'));
  const openingBalance = currentBalance.subtract(windowBalanceImpact);
  const facts = selectedMovements.transactions.map((transaction) => flowFact(transaction, currency, scope.filters.sharedAmountMode)).filter((fact): fact is AnalyticsFlowFact => Boolean(fact));
  const scheduledFacts = scheduledFlowFacts(
    scheduledResults.flatMap((result) => result.items),
    new Set(scope.selectedAccountIds),
    currency,
    now.toISOString(),
  );
  const hasCompleteBalanceScope = scope.filters.sharedAmountMode === 'full' && scope.filters.tagIds.length === 0 && scope.filters.includeIgnoredMovements;
  const reportFacts = [...facts, ...scheduledFacts];
  const projection = calculateFlowProjection({
    openingBalance: { value: openingBalance.toFixed(2), currency },
    facts: reportFacts,
    window,
    now: now.toISOString(),
  });
  return buildAnalyticsFlowReport({
    window,
    windowRelation: window.endExclusive <= now.toISOString().slice(0, 10) ? 'past' : 'current',
    projectionMode: hasCompleteBalanceScope ? 'accountBalance' : 'filteredImpact',
    currency,
    summary: calculateFlowSummary(projection, currency, { value: currentBalance.toFixed(2), currency }),
    projection,
    upcoming: calculateUpcomingFlow(reportFacts, window, now.toISOString(), currency),
    insights: calculateFlowInsights(reportFacts, projection, window, currency),
  });
}

export async function analyticsGetFlowUpcoming(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowUpcomingInput,
): Promise<AnalyticsFlowUpcomingResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, windows, true),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });
  const currency = input.currency.trim().toUpperCase();
  const items = transactions
    .filter((transaction) => transaction.currency.toUpperCase() === currency)
    .filter((transaction) => transaction.type === 'income' || transaction.type === 'expense')
    .filter((transaction) => new Date(transaction.occurredAt) >= now)
    .map((transaction) => ({
      movementId: transaction.id,
      title: transaction.description || transaction.merchant || (transaction.type === 'income' ? 'Income' : 'Expense'),
      amount: transaction.analyticsAmount ?? transaction.amount,
      occurredAt: transaction.occurredAt,
      type: transaction.type,
    }))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  return {
    incomeItems: items.filter((item) => item.type === 'income').map((item) => ({
      movementId: item.movementId, title: item.title, amount: item.amount, occurredAt: item.occurredAt,
    })),
    expenseItems: items.filter((item) => item.type === 'expense').map((item) => ({
      movementId: item.movementId, title: item.title, amount: item.amount, occurredAt: item.occurredAt,
    })),
  };
}

export async function analyticsGetFlowInsights(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowInsightsInput,
): Promise<AnalyticsFlowInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5, scope.filters.includePlannedMovements);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, windows, true),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });

  return buildFlowInsights({
    postedTransactions: transactions,
    currency: input.currency,
    currentWindow: windows,
    period: scope.filters.period,
  });
}
