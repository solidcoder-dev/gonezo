import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import type {
  LedgerTransactionFilterInput,
  LedgerTransactionType,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomy.port';
import {
  buildAnalyticsCashFlowSummary,
  buildSpendingOverview,
  listAnalyticsCurrencies,
} from '../application/analyticsBuilders';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsCurrencyScopeInput,
  AnalyticsGetFilterFacetsInput,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
} from '../application/analytics.port';
import {
  analyticsPeriodMonths,
  normalizeAnalyticsFilters,
  type AnalyticsFiltersInput,
} from '../application/analyticsFilters';
import { listAnalyticsMovements, type AnalyticsMovementReaderPort } from './analyticsMovementReader';

type AnalyticsQueryPort = AnalyticsMovementReaderPort & {
  preferencesGet(): Promise<UserPreferencesResult>;
  taxonomyListCategories(input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }): Promise<TaxonomyListCategoriesResult>;
  taxonomyListTags(input?: { includeArchived?: boolean }): Promise<TaxonomyListTagsResult>;
  orchestrationListTransactionTaxonomy(input: { transactionIds: string[] }): Promise<OrchestrationListTransactionTaxonomyResult>;
};

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addUtcYears(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

function dateFilterValue(date: Date): string {
  return date.toISOString();
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function analyticsVisibleRangeStart(input: AnalyticsFiltersInput | undefined, now: Date): Date | undefined {
  const filters = normalizeAnalyticsFilters(input);
  if (filters.period === '1W') {
    return addUtcDays(startOfUtcDay(now), -6);
  }
  if (filters.period === '5Y') {
    return addUtcYears(startOfUtcYear(now), -4);
  }
  if (filters.period === 'ALL') {
    return undefined;
  }
  const periodMonths = analyticsPeriodMonths(filters.period);
  return addUtcMonths(startOfUtcMonth(now), -(periodMonths - 1));
}

function analyticsDateRange(input: AnalyticsFiltersInput | undefined, now: Date): Pick<LedgerTransactionFilterInput, 'fromDate' | 'toDate'> {
  const rangeStart = analyticsVisibleRangeStart(input, now);
  if (!rangeStart) {
    return {};
  }
  return {
    fromDate: dateFilterValue(rangeStart),
    toDate: dateFilterValue(endOfUtcDay(now)),
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
