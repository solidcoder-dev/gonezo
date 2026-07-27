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
import { buildAnalyticsFlowReport, type AnalyticsFlowFact } from '../application/analyticsFlowReport';
import {
  buildAnalyticsSpendingReport,
  normalizeAnalyticsPeriodSelection,
  resolveAnalyticsSpendingWindow,
  type AnalyticsCategoryReference,
  type AnalyticsPeriodSelection,
  type AnalyticsSpendingMovement,
  type AnalyticsSpendingPeriodWindow,
} from '../application/spendingReport';
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
  AnalyticsSpendingReportInput,
  AnalyticsTopExpensesInput,
  AnalyticsTopExpensesResult,
  AnalyticsFlowReportInput,
  AnalyticsFlowReport,
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
  analyticsListCategories?: () => Promise<{ items: AnalyticsCategoryReference[] }>;
  taxonomyListTags(input?: { includeArchived?: boolean }): Promise<TaxonomyListTagsResult>;
  orchestrationListTransactionTaxonomy(input: { transactionIds: string[] }): Promise<OrchestrationListTransactionTaxonomyResult>;
  schedulingListMovements(input: { sourceAccountId: string }): Promise<SchedulingListMovementsResult>;
};

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
    items: transaction.items.map((item) => ({ amount: item.amount, categoryId: item.categoryId, categoryName: item.note })),
  };
}

function spendingSelection(input: AnalyticsSpendingReportInput | AnalyticsTopExpensesInput): AnalyticsPeriodSelection {
  return normalizeAnalyticsPeriodSelection(input.periodSelection);
}

async function listSpendingMovements(
  port: AnalyticsQueryPort,
  filters: AnalyticsFilters,
  accountIds: string[],
  window: AnalyticsSpendingPeriodWindow,
): Promise<AnalyticsSpendingMovement[]> {
  const result = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(filters, {
      start: new Date(`${window.start}T00:00:00.000Z`),
      end: new Date(`${window.endExclusive}T00:00:00.000Z`),
    }, true),
    includeIgnoredMovements: filters.includeIgnoredMovements,
    sharedAmountMode: filters.sharedAmountMode,
  });
  return result.transactions.map(spendingMovement);
}

type AnalyticsQueryScope = {
  filters: AnalyticsFilters;
  compatibleAccounts: LedgerAccountItem[];
  selectedAccountIds: string[];
};

function postedTransactionIds(transactions: Array<{ id: string; reference?: { source: string; transactionId?: string } }>): string[] {
  return transactions
    .filter((transaction) => transaction.reference?.source === 'posted')
    .map((transaction) => transaction.reference?.transactionId)
    .filter((id): id is string => Boolean(id));
}

function dateFilterValue(date: Date): string {
  return date.toISOString();
}

function analyticsWindowDateRange(window: { start: Date; end: Date } | undefined): Pick<LedgerTransactionFilterInput, 'fromDate' | 'toDateExclusive'> {
  if (!window) {
    return {};
  }
  return {
    fromDate: dateFilterValue(window.start),
    toDateExclusive: dateFilterValue(window.end),
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
): LedgerTransactionFilterInput & { currency: string; includePlannedMovements: boolean } {
  return {
    statuses: ['posted'],
    tagIds: includeTags && scope.tagIds.length > 0 ? scope.tagIds : undefined,
    ...analyticsWindowDateRange(window),
    currency: scope.currency,
    includePlannedMovements: scope.includePlannedMovements,
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

export async function analyticsGetSpendingReport(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingReportInput,
): Promise<import('../application/spendingReport').AnalyticsSpendingReport> {
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
  const [currentMovements, previousMovements, categories] = await Promise.all([
    listSpendingMovements(port, scope.filters, scope.selectedAccountIds, window),
    previousWindow ? listSpendingMovements(port, scope.filters, scope.selectedAccountIds, previousWindow) : Promise.resolve([]),
    listAnalyticsCategoryReferences(port),
  ]);
  return buildAnalyticsSpendingReport({
    window,
    previousWindow,
    currency: input.currency,
    currentMovements,
    previousMovements,
    categories,
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
  const [movements, categories] = await Promise.all([
    listSpendingMovements(port, scope.filters, scope.selectedAccountIds, window),
    listAnalyticsCategoryReferences(port),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const items = movements
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

export async function analyticsGetOverviewSnapshot(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewSnapshotInput,
): Promise<AnalyticsOverviewSnapshotResult> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = scope.selectedAccountIds;
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);

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
  const windows = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements);
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
  const [balances, transactions] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    listAnalyticsMovements(port, {
      accountIds: scope.selectedAccountIds,
      filters: analyticsTransactionFilters(scope.filters, windows, true),
      includeIgnoredMovements: scope.filters.includeIgnoredMovements,
      sharedAmountMode: 'full',
    }),
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
    scheduledMovements: [],
    now,
  });
}

function flowFact(transaction: Awaited<ReturnType<typeof listAnalyticsMovements>>['transactions'][number], currency: string, amountMode: 'personal' | 'full'): AnalyticsFlowFact | undefined {
  const source = transaction.reference?.source;
  if (!source || transaction.type === 'transfer') return undefined;
  return { id: transaction.analyticsFactId ?? transaction.id, source, effectiveAt: transaction.occurredAt, accountId: transaction.accountId, type: transaction.type, amount: { value: amountMode === 'full' ? transaction.analyticsFullAmount : transaction.analyticsPersonalAmount, currency } };
}

export async function analyticsGetFlowReport(port: AnalyticsQueryPort, input: AnalyticsFlowReportInput): Promise<AnalyticsFlowReport> {
  const scope = await resolveAnalyticsQueryScope(port, { ...input.filters, currency: input.currency });
  if (scope.selectedAccountIds.length === 0) throw new Error('No compatible accounts for this currency');
  const now = new Date();
  const selection = normalizeAnalyticsPeriodSelection(input.periodSelection);
  const window = resolveAnalyticsSpendingWindow(selection, now.toISOString().slice(0, 10), undefined, scope.filters.includePlannedMovements);
  const windowDates = { start: new Date(`${window.start}T00:00:00.000Z`), end: new Date(`${window.endExclusive}T00:00:00.000Z`) };
  const [accounts, balanceMovements, selectedMovements] = await Promise.all([
    selectedAccountSummaries(port, scope.selectedAccountIds),
    listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, undefined, false), includeIgnoredMovements: true, sharedAmountMode: 'full' }),
    listAnalyticsMovements(port, { accountIds: scope.selectedAccountIds, filters: analyticsTransactionFilters(scope.filters, windowDates, true), includeIgnoredMovements: scope.filters.includeIgnoredMovements, sharedAmountMode: scope.filters.sharedAmountMode }),
  ]);
  const currency = input.currency.trim().toUpperCase();
  const currentCents = accounts.reduce((sum, account) => sum + Math.round(Number(account.balanceAmount) * 100), 0);
  const postedBalanceFacts = balanceMovements.transactions.map((transaction) => flowFact(transaction, currency, 'full')).filter((fact): fact is AnalyticsFlowFact => Boolean(fact && fact.source === 'posted' && fact.effectiveAt >= `${window.start}T00:00:00.000Z` && fact.effectiveAt < now.toISOString()));
  const openingCents = currentCents - postedBalanceFacts.reduce((sum, fact) => sum + (fact.type === 'expense' || fact.type === 'transfer_out' ? -Math.abs(Math.round(Number(fact.amount.value) * 100)) : Math.round(Number(fact.amount.value) * 100)), 0);
  const facts = selectedMovements.transactions.map((transaction) => flowFact(transaction, currency, scope.filters.sharedAmountMode)).filter((fact): fact is AnalyticsFlowFact => Boolean(fact));
  const hasCompleteBalanceScope = scope.filters.sharedAmountMode === 'full' && scope.filters.tagIds.length === 0 && scope.filters.includeIgnoredMovements;
  return buildAnalyticsFlowReport({
    window,
    windowRelation: window.endExclusive <= now.toISOString().slice(0, 10) ? 'past' : 'current',
    projectionMode: hasCompleteBalanceScope ? 'accountBalance' : 'filteredImpact',
    currency,
    openingBalance: { value: (openingCents / 100).toFixed(2), currency },
    currentBalance: { value: (currentCents / 100).toFixed(2), currency },
    facts,
    now: now.toISOString(),
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
