import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import type {
  LedgerGetCashFlowSeriesResult,
  LedgerListAccountsResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../ledger/application/ledger.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type { TaxonomyListCategoriesResult } from '../../taxonomy/application/taxonomy.port';
import {
  buildAnalyticsCashFlowSummary,
  buildSpendingOverview,
  listAnalyticsCurrencies,
} from '../application/analyticsBuilders';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsListCurrenciesResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
} from '../application/analytics.port';

type AnalyticsQueryPort = {
  preferencesGet(): Promise<UserPreferencesResult>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  taxonomyListCategories(input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }): Promise<TaxonomyListCategoriesResult>;
};

async function listAllAccountTransactions(
  port: AnalyticsQueryPort,
  accountId: string,
): Promise<LedgerListTransactionsResult['content']> {
  const content: LedgerListTransactionsResult['content'] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const result = await port.ledgerListTransactions({
      accountId,
      filters: { statuses: ['posted'] },
      pagination: { page, size: 100 },
      sort: [{ field: 'occurredAt', direction: 'desc' }],
    });
    content.push(...result.content);
    hasNext = result.hasNext && result.content.length > 0;
    page += 1;
  }

  return content;
}

async function listAnalyticsTransactions(port: AnalyticsQueryPort): Promise<{
  accounts: LedgerListAccountsResult['items'];
  transactions: LedgerListTransactionsResult['content'];
}> {
  const accounts = await port.ledgerListAccounts();
  const pages = await Promise.all(
    accounts.items.map((account) => listAllAccountTransactions(port, account.id)),
  );
  return { accounts: accounts.items, transactions: pages.flat() };
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

export async function analyticsGetCashFlowSeries(
  port: AnalyticsQueryPort,
  input: AnalyticsCashFlowSeriesInput,
): Promise<LedgerGetCashFlowSeriesResult> {
  const { accounts, transactions } = await listAnalyticsTransactions(port);
  return buildCashFlowSeries({
    accounts,
    transactions,
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    now: new Date(),
  });
}

export async function analyticsGetPeriodCashFlowSummary(
  port: AnalyticsQueryPort,
  input: { currency: string },
): Promise<AnalyticsCashFlowSummaryResult> {
  const { transactions } = await listAnalyticsTransactions(port);
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsGetSpendingOverview(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingOverviewInput,
): Promise<AnalyticsSpendingOverviewResult> {
  const [{ transactions }, categories] = await Promise.all([
    listAnalyticsTransactions(port),
    port.taxonomyListCategories({ appliesTo: 'expense', includeArchived: true }),
  ]);
  return buildSpendingOverview({
    transactions,
    categories: categories.items,
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    now: new Date(),
  });
}
