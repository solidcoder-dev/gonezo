import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import type {
  LedgerTransactionFilterInput,
  LedgerTransactionType,
  LedgerGetAccountSummaryResult,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomy.port';
import type { SharingMovementDetailsResult } from '../../sharing/application/sharing.port';
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
  analyticsPeriodMonths,
  normalizeAnalyticsFilters,
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
  sharingGetMovementDetails(input: { transactionId: string }): Promise<SharingMovementDetailsResult>;
  schedulingListMovements(input: { sourceAccountId: string }): Promise<SchedulingListMovementsResult>;
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

function analyticsVisibleRangeStart(input: AnalyticsFiltersInput | undefined, now: Date): Date | undefined {
  const filters = normalizeAnalyticsFilters(input);
  if (filters.period === 'ALL') {
    return undefined;
  }
  return buildAnalyticsOverviewWindows(filters.period, now).currentWindow.start;
}

function analyticsDateRange(input: AnalyticsFiltersInput | undefined, now: Date): Pick<LedgerTransactionFilterInput, 'fromDate' | 'toDate'> {
  const filters = normalizeAnalyticsFilters(input);
  if (filters.period === 'ALL') {
    return {};
  }
  const window = buildAnalyticsOverviewWindows(filters.period, now).currentWindow;
  return {
    fromDate: dateFilterValue(window.start),
    toDate: dateFilterValue(endOfUtcDay(addUtcDays(window.end, -1))),
  };
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

function toLedgerTransactionTypes(types: string[]): LedgerTransactionType[] | undefined {
  if (types.length === 0) {
    return undefined;
  }
  const ledgerTypes = new Set<LedgerTransactionType>();
  for (const type of types) {
    if (type === 'transfer') {
      ledgerTypes.add('transfer');
      ledgerTypes.add('transfer_out');
      ledgerTypes.add('transfer_in');
    } else {
      ledgerTypes.add(type as LedgerTransactionType);
    }
  }
  return [...ledgerTypes];
}

async function selectedAnalyticsAccountIds(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | undefined,
): Promise<string[]> {
  const filters = normalizeAnalyticsFilters(input);
  const accounts = await port.ledgerListAccounts();
  const requestedAccountIds = new Set(filters.accountIds);
  return accounts.items
    .filter((account) => (
      requestedAccountIds.size > 0
        ? requestedAccountIds.has(account.id)
        : !filters.currency || account.currency.toUpperCase() === filters.currency
    ))
    .map((account) => account.id);
}

function analyticsTransactionFilters(
  input: AnalyticsFiltersInput | undefined,
  now: Date,
  includeTags: boolean,
): LedgerTransactionFilterInput {
  const filters = normalizeAnalyticsFilters(input);
  return {
    statuses: ['posted'],
    types: toLedgerTransactionTypes(filters.movementTypes),
    tagIds: includeTags && filters.tagIds.length > 0 ? filters.tagIds : undefined,
    ...analyticsDateRange(filters, now),
  };
}

function analyticsWindowTransactionFilters(
  input: AnalyticsFiltersInput | undefined,
  window: { start: Date; end: Date } | undefined,
  includeTags: boolean,
): LedgerTransactionFilterInput {
  const filters = normalizeAnalyticsFilters(input);
  return {
    statuses: ['posted'],
    types: toLedgerTransactionTypes(filters.movementTypes),
    tagIds: includeTags && filters.tagIds.length > 0 ? filters.tagIds : undefined,
    ...analyticsWindowDateRange(window),
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

async function listScopedAnalyticsMovements(
  port: AnalyticsQueryPort,
  input: AnalyticsFiltersInput | undefined,
  now = new Date(),
  includeTags = true,
) {
  const accountIds = await selectedAnalyticsAccountIds(port, input);
  return listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsTransactionFilters(input, now, includeTags),
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
  const normalizedFilters = normalizeAnalyticsFilters(input.filters);
  const now = new Date();
  const [{ transactions }, accounts, tags] = await Promise.all([
    listScopedAnalyticsMovements(port, normalizedFilters, now, false),
    port.ledgerListAccounts(),
    port.taxonomyListTags({ includeArchived: false }),
  ]);

  const transactionIds = transactions.map((transaction) => transaction.id);
  const taxonomy = transactionIds.length > 0
    ? await port.orchestrationListTransactionTaxonomy({ transactionIds })
    : { items: [] };
  const selectedTagIds = new Set(normalizedFilters.tagIds);
  const scopedTagIds = new Set<string>(selectedTagIds);
  for (const item of taxonomy.items) {
    for (const tagId of item.tagIds ?? []) {
      scopedTagIds.add(tagId);
    }
  }

  return {
    accounts: accounts.items
      .map((account) => ({
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const { accounts, transactions } = await listScopedAnalyticsMovements(port, filters, now);
  return buildCashFlowSeries({
    accounts,
    transactions,
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    periodCount: 5,
    visibleRangeStart: analyticsVisibleRangeStart(filters, now) ?? earliestTransactionDate(transactions),
    now,
  });
}

export async function analyticsGetPeriodCashFlowSummary(
  port: AnalyticsQueryPort,
  input: AnalyticsCurrencyScopeInput,
): Promise<AnalyticsCashFlowSummaryResult> {
  const { transactions } = await listScopedAnalyticsMovements(port, { ...input.filters, currency: input.currency }, new Date());
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsGetOverviewSnapshot(
  port: AnalyticsQueryPort,
  input: AnalyticsOverviewSnapshotInput,
): Promise<AnalyticsOverviewSnapshotResult> {
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);

  if (filters.period === 'ALL') {
    const { transactions } = await listAnalyticsMovements(port, {
      accountIds,
      filters: analyticsWindowTransactionFilters(filters, undefined, true),
    });
    const windows = buildAnalyticsOverviewWindows(filters.period, now, earliestTransactionDate(transactions));
    return buildAnalyticsOverviewSnapshot({
      currentTransactions: transactions,
      currency: input.currency,
      currentWindow: windows.currentWindow,
    });
  }

  const windows = buildAnalyticsOverviewWindows(filters.period, now);
  const [currentResult, previousResult] = await Promise.all([
    listAnalyticsMovements(port, {
      accountIds,
      filters: analyticsWindowTransactionFilters(filters, windows.currentWindow, true),
    }),
    windows.previousWindow
      ? listAnalyticsMovements(port, {
          accountIds,
          filters: analyticsWindowTransactionFilters(filters, windows.previousWindow, true),
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);
  const windows = buildAnalyticsOverviewWindows(filters.period, now);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsWindowTransactionFilters(filters, windows.currentWindow, true),
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
      filters,
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const [{ transactions }, categories] = await Promise.all([
    listScopedAnalyticsMovements(port, filters, now),
    port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true }),
  ]);
  return buildSpendingOverview({
    transactions,
    categories: categories.items,
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    periodMonths: analyticsPeriodMonths(filters.period),
    now,
  });
}

export async function analyticsGetSpendingDashboard(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingDashboardInput,
): Promise<AnalyticsSpendingDashboardResult> {
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);

  if (filters.period === 'ALL') {
    const [{ transactions }, categories] = await Promise.all([
      listAnalyticsMovements(port, {
        accountIds,
        filters: analyticsWindowTransactionFilters(filters, undefined, true),
      }),
      port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true }),
    ]);
    const windows = buildAnalyticsOverviewWindows(filters.period, now, earliestTransactionDate(transactions));
    return buildSpendingDashboard({
      currentTransactions: transactions,
      categories: categories.items,
      currency: input.currency,
      currentWindow: windows.currentWindow,
    });
  }

  const windows = buildAnalyticsOverviewWindows(filters.period, now);
  const [currentResult, previousResult, categories] = await Promise.all([
    listAnalyticsMovements(port, {
      accountIds,
      filters: analyticsWindowTransactionFilters(filters, windows.currentWindow, true),
    }),
    windows.previousWindow
      ? listAnalyticsMovements(port, {
          accountIds,
          filters: analyticsWindowTransactionFilters(filters, windows.previousWindow, true),
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const allPeriodMovements = filters.period === 'ALL'
    ? await listScopedAnalyticsMovements(port, filters, now, true)
    : undefined;
  const accountIds = allPeriodMovements
    ? undefined
    : await selectedAnalyticsAccountIds(port, filters);
  const earliestOccurredAt = allPeriodMovements ? earliestTransactionDate(allPeriodMovements.transactions) : undefined;
  const window = buildSpendingTimelineWindow(filters.period, now, input.periodOffset, earliestOccurredAt);
  const transactions = allPeriodMovements
    ? allPeriodMovements.transactions
    : (await listAnalyticsMovements(port, {
      accountIds: accountIds ?? [],
      filters: analyticsWindowTransactionFilters(filters, window, true),
    })).transactions;

  return buildSpendingTimeline({
    transactions,
    currency: input.currency,
    currentWindow: window,
    period: filters.period,
  });
}

export async function analyticsGetSpendingTopExpenses(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingTopExpensesInput,
): Promise<AnalyticsSpendingTopExpensesResult> {
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);
  const windows = buildAnalyticsOverviewWindows(filters.period, now);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsWindowTransactionFilters(filters, windows.currentWindow, true),
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);
  const windows = buildSpendingTimelineWindow(filters.period, now, input.periodOffset, undefined, 5);
  const [balances, transactions, scheduledMovements] = await Promise.all([
    selectedAccountSummaries(port, accountIds),
    listAnalyticsMovements(port, {
      accountIds,
      filters: analyticsWindowTransactionFilters(filters, windows, true),
    }),
    selectedSchedulingMovements(port, accountIds),
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
    period: filters.period,
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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);
  const windows = buildSpendingTimelineWindow(filters.period, now, 0, undefined, 5);
  const scheduledMovements = await selectedSchedulingMovements(port, accountIds);

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
  const filters = normalizeAnalyticsFilters({ ...input.filters, currency: input.currency });
  const now = new Date();
  const accountIds = await selectedAnalyticsAccountIds(port, filters);
  const windows = buildSpendingTimelineWindow(filters.period, now, 0, undefined, 5);
  const { transactions } = await listAnalyticsMovements(port, {
    accountIds,
    filters: analyticsWindowTransactionFilters(filters, windows, true),
  });

  return buildFlowInsights({
    postedTransactions: transactions,
    currency: input.currency,
    currentWindow: windows,
    period: filters.period,
  });
}
