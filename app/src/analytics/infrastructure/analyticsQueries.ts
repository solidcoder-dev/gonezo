import { buildCashFlowSeries } from '../../ledger/application/cashFlowSeries';
import type {
  LedgerGetCashFlowSeriesResult,
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
import { listAnalyticsMovements, type AnalyticsMovementReaderPort } from './analyticsMovementReader';

type AnalyticsQueryPort = AnalyticsMovementReaderPort & {
  preferencesGet(): Promise<UserPreferencesResult>;
  taxonomyListCategories(input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }): Promise<TaxonomyListCategoriesResult>;
};

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
  const { accounts, transactions } = await listAnalyticsMovements(port);
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
  const { transactions } = await listAnalyticsMovements(port);
  return buildAnalyticsCashFlowSummary(transactions, input.currency);
}

export async function analyticsGetSpendingOverview(
  port: AnalyticsQueryPort,
  input: AnalyticsSpendingOverviewInput,
): Promise<AnalyticsSpendingOverviewResult> {
  const [{ transactions }, categories] = await Promise.all([
    listAnalyticsMovements(port),
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
