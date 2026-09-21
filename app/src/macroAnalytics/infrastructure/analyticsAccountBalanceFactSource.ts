import type { AnalyticsAccountBalanceSnapshotInput, AnalyticsAccountBalanceSnapshotResult } from '../../analytics/application/analytics.port';
import type { AccountBalanceFactSourcePort, AccountBalanceFactQuery } from '../application/accountBalanceFactSource.port';
import { createAccountBalanceFact } from '../domain/accountBalanceFact';
import { toMacroAccountTypeCode } from './macroAccountTypeMapper';

type AnalyticsAccountBalanceSnapshotReader = Readonly<{
  analyticsGetAccountBalanceSnapshot(input: AnalyticsAccountBalanceSnapshotInput): Promise<AnalyticsAccountBalanceSnapshotResult>;
}>;

export function createAnalyticsAccountBalanceFactSource(
  analytics: AnalyticsAccountBalanceSnapshotReader,
): AccountBalanceFactSourcePort {
  return {
    async listAccountBalanceFacts(query: AccountBalanceFactQuery) {
      const result = await analytics.analyticsGetAccountBalanceSnapshot({
        asOfLocalDateExclusive: nextMonthCutoff(query.period.value),
        zoneId: query.timeZone,
        ...(query.currency === undefined ? {} : { currency: query.currency }),
      });
      return result.items.map(({ accountType, currency, balanceAmount }) => createAccountBalanceFact({
        asOfLocalDateExclusive: result.asOfLocalDateExclusive,
        accountType: toMacroAccountTypeCode(accountType),
        currency,
        balanceAmount,
      }));
    },
  };
}

function nextMonthCutoff(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error('Analytics period must use a valid YYYY-MM value');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1 || month < 1 || month > 12) throw new Error('Analytics period must use a valid YYYY-MM value');
  const cutoff = new Date(0);
  cutoff.setUTCFullYear(year, month, 1);
  return cutoff.toISOString().slice(0, 10);
}
