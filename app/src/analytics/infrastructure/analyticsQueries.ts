import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import type {
  LedgerAccountItem,
  LedgerTransactionFilterInput,
  LedgerGetAccountSummaryResult,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomy.port';
import type { SchedulingListMovementsResult } from '../../scheduling/application/scheduling.port';
import {
  buildAnalyticsCashFlowSummary,
  buildFlowInsights,
  buildFlowProjection,
  buildFlowUpcoming,
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
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsCurrencyScopeInput,
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
  AnalyticsSpendingDashboardInput,
  AnalyticsSpendingDashboardResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
  AnalyticsSpendingTimelineInput,
  AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesInput,
  AnalyticsSpendingTopExpensesResult,
} from '../application/analytics.port';
import {
  normalizeAnalyticsFilters,
  type AnalyticsFilters,
  type AnalyticsFiltersInput,
} from '../application/analyticsFilters';
import { listAnalyticsMovements, type AnalyticsMovementReaderPort } from './analyticsMovementReader';
import { analyticsGetOverviewRecurringInsight } from './overviewRecurringInsightQuery';
import { analyticsGetOverviewSharingInsights } from './overviewSharingInsightsQuery';

type AnalyticsQueryPort = AnalyticsMovementReaderPort & {
  ledgerGetAccountSummary(input: { accountId: string }): Promise<LedgerGetAccountSummaryResult>;
  preferencesGet(): Promise<UserPreferencesResult>;
  taxonomyListCategories(input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }): Promise<TaxonomyListCategoriesResult>;
  taxonomyListTags(input?: { includeArchived?: boolean }): Promise<TaxonomyListTagsResult>;
  orchestrationListTransactionTaxonomy(input: { transactionIds: string[] }): Promise<OrchestrationListTransactionTaxonomyResult>;
  schedulingListMovements(input: { sourceAccountId: string }): Promise<SchedulingListMovementsResult>;
};

type AnalyticsQueryScope = {
  filters: AnalyticsFilters;
  compatibleAccounts: LedgerAccountItem[];
  selectedAccountIds: string[];
};

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function dateFilterValue(date: Date): string {
  return date.toISOString();
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function analyticsWindowDateRange(window: { start: Date; end: Date } | undefined): Pick<LedgerTransactionFilterInput, 'fromDate' | 'toDate'> {
  if (!window) {
    return {};
  }
  return {
    fromDate: dateFilterValue(window.start),
    toDate: dateFilterValue(endOfUtcDay(addUtcDays(window.end, -1))),
  };
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

function assertSupportedAnalyticsCurrency(accounts: LedgerAccountItem[], currency: string): void {
  if (!currency) {
    return;
  }
  const supportedCurrencies = new Set(accounts.map((account) => account.currency.trim().toUpperCase()));
  if (!supportedCurrencies.has(currency)) {
    throw new Error(`unsupported currency code: ${currency}`);
  }
}

function compatibleAnalyticsAccounts(accounts: LedgerAccountItem[], currency: string): LedgerAccountItem[] {
  if (!currency) {
    return [...accounts];
  }
  return accounts.filter((account) => account.currency.trim().toUpperCase() === currency);
}

function resolveSelectedAnalyticsAccounts(accounts: LedgerAccountItem[], filters: AnalyticsFilters): LedgerAccountItem[] {
  const compatibleAccounts = compatibleAnalyticsAccounts(accounts, filters.currency);
  if (filters.accountIds.length === 0) {
    return compatibleAccounts;
  }

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  return filters.accountIds.map((accountId) => {
    const account = accountsById.get(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    if (filters.currency && account.currency.trim().toUpperCase() !== filters.currency) {
      throw new Error(`Analytics account currency must match selected currency (${filters.currency})`);
    }
    return account;
  });
}

function assertValidAnalyticsTagIds(
  tags: Awaited<ReturnType<AnalyticsQueryPort['taxonomyListTags']>>['items'],
  selectedTagIds: string[],
): void {
  if (selectedTagIds.length === 0) {
    return;
  }

  const availableTagIds = new Set(tags.map((tag) => tag.id));
  for (const tagId of selectedTagIds) {
    if (!availableTagIds.has(tagId)) {
      throw new Error(`Tag not found: ${tagId}`);
    }
  }
}

async function resolveAnalyticsQueryScope(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | undefined,
): Promise<AnalyticsQueryScope> {
  const filters = normalizeAnalyticsFilters(input);
  const [accounts, tags] = await Promise.all([
    port.ledgerListAccounts(),
    filters.tagIds.length > 0
      ? port.taxonomyListTags({ includeArchived: false })
      : Promise.resolve({ items: [] }),
  ]);

  assertSupportedAnalyticsCurrency(accounts.items, filters.currency);
  assertValidAnalyticsTagIds(tags.items, filters.tagIds);

  const compatibleAccounts = compatibleAnalyticsAccounts(accounts.items, filters.currency);
  const selectedAccounts = resolveSelectedAnalyticsAccounts(accounts.items, filters);

  return {
    filters,
    compatibleAccounts,
    selectedAccountIds: selectedAccounts.map((account) => account.id),
  };
}

function analyticsTransactionFilters(
  scope: AnalyticsFilters,
  window: { start: Date; end: Date } | undefined,
  includeTags: boolean,
): LedgerTransactionFilterInput {
  return {
    statuses: ['posted'],
    tagIds: includeTags && scope.tagIds.length > 0 ? scope.tagIds : undefined,
    ...analyticsWindowDateRange(window),
  };
}

async function listScopedAnalyticsMovements(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | AnalyticsFilters | undefined,
  window: { start: Date; end: Date } | undefined,
  includeTags = true,
) {
  const scope = await resolveAnalyticsQueryScope(port, input);
  return listAnalyticsMovements(port, {
    accountIds: scope.selectedAccountIds,
    filters: analyticsTransactionFilters(scope.filters, window, includeTags),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });
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

export async function analyticsGetFilterFacets(
  port: AnalyticsQueryPort,
  input: AnalyticsGetFilterFacetsInput = {},
): Promise<AnalyticsGetFilterFacetsResult> {
  const scope = await resolveAnalyticsQueryScope(port, input.filters);
  const now = new Date();
  const currentWindow = buildAnalyticsOverviewWindows(scope.filters.period, now).currentWindow;
  const [{ transactions }, tags] = await Promise.all([
    listScopedAnalyticsMovements(port, scope.filters, currentWindow, false),
    port.taxonomyListTags({ includeArchived: false }),
  ]);

  const transactionIds = transactions.map((transaction) => transaction.id);
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
    : buildAnalyticsOverviewWindows(scope.filters.period, now).currentWindow;
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
    : buildAnalyticsOverviewWindows(scope.filters.period, now).currentWindow;
  const { transactions } = await listScopedAnalyticsMovements(port, scope.filters, currentWindow);
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsGetOverviewSnapshot(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewSnapshotInput,
): Promise<AnalyticsOverviewSnapshotResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now);

  const [currentResult, previousResult] = await Promise.all([
    listAnalyticsMovements(port, {
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

  return buildAnalyticsOverviewSnapshot({
    currentTransactions: currentResult.transactions,
    previousTransactions: previousResult.transactions,
    currency: input.currency,
    currentWindow: windows.currentWindow,
    previousWindow: windows.previousWindow,
  });
}

export async function analyticsGetOverviewInsights(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewInsightsInput,
): Promise<AnalyticsOverviewInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(scope.filters, windows.currentWindow, true),
    includeIgnoredMovements: scope.filters.includeIgnoredMovements,
    sharedAmountMode: scope.filters.sharedAmountMode,
  });
  const transactionIds = transactions.map((transaction) => transaction.id);
  const [taxonomyAssignments, tags, sharingInsights, recurringInsight] = await Promise.all([
    transactionIds.length > 0
      ? port.orchestrationListTransactionTaxonomy({ transactionIds })
      : Promise.resolve({ items: [] }),
    port.taxonomyListTags({ includeArchived: false }),
    analyticsGetOverviewSharingInsights(port, transactions),
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
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now);
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
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now);
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

async function selectedSchedulingMovements(
  port: AnalyticsQueryPort,
  accountIds: string[],
): Promise<NonNullable<SchedulingListMovementsResult['items']>> {
  const results = await Promise.all(accountIds.map((accountId) => port.schedulingListMovements({ sourceAccountId: accountId })));
  const movementById = new Map<string, SchedulingListMovementsResult['items'][number]>();
  for (const result of results) {
    for (const movement of result.items) {
      movementById.set(movement.id, movement);
    }
  }
  return [...movementById.values()];
}

export async function analyticsGetFlowProjection(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowProjectionInput,
): Promise<AnalyticsFlowProjectionResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, input.periodOffset, undefined, 5);
  const [balances, transactions, scheduledMovements] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, windows, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: 'full',
    }),
    selectedSchedulingMovements(port, scope.selectedAccountIds),
  ]);

  const currentBalanceAmount = balances.reduce(
    (total, account) => (Number.isFinite(Number(account.balanceAmount))
      ? (Number(total) + Number(account.balanceAmount)).toFixed(2)
      : total),
    '0.00',
  );

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

export async function analyticsGetFlowUpcoming(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowUpcomingInput,
): Promise<AnalyticsFlowUpcomingResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5);
  const scheduledMovements = await selectedSchedulingMovements(port, scope.selectedAccountIds);

  return buildFlowUpcoming({
    scheduledMovements,
    currency: input.currency,
    currentWindow: windows,
  });
}

export async function analyticsGetFlowInsights(
  port: AnalyticsQueryPort,
  input: AnalyticsFlowInsightsInput,
): Promise<AnalyticsFlowInsightsResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const windows = buildSpendingTimelineWindow(scope.filters.period, now, 0, undefined, 5);
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
