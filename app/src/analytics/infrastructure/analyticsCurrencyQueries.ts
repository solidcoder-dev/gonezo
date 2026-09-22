import type { AnalyticsListCurrenciesResult } from '../application/analytics.port';
import { listAnalyticsCurrencies } from '../application/analyticsBuilders';
import type { AnalyticsQueryPort } from './analyticsQueryScope';

export async function analyticsListCurrencies(port: AnalyticsQueryPort): Promise<AnalyticsListCurrenciesResult> {
  const [accounts, preferences] = await Promise.all([port.ledgerListAccounts(), port.preferencesGet()]);
  const preferredAccount = preferences.defaultAccountId
    ? accounts.items.find((account) => account.id === preferences.defaultAccountId)
    : accounts.items[0];
  return { items: listAnalyticsCurrencies(accounts.items, preferredAccount?.currency) };
}
