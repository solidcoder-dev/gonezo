import type { AnalyticsAccountBalanceSnapshotInput, AnalyticsAccountBalanceSnapshotResult } from '../../analytics/application/analyticsBalance.contract';
import type { AccountBalanceFactSourcePort, AccountBalanceFactQuery } from '../application/accountBalanceFactSource.port';
import { createAccountBalanceFact } from '../domain/accountBalanceFact';
import { toMacroAccountTypeCode } from './macroAccountTypeMapper';
import { accountBalanceCutoffForPeriod } from '../domain/analyticsPeriod';

type AnalyticsAccountBalanceSnapshotReader = Readonly<{
  analyticsGetAccountBalanceSnapshot(input: AnalyticsAccountBalanceSnapshotInput): Promise<AnalyticsAccountBalanceSnapshotResult>;
}>;

export function createAnalyticsAccountBalanceFactSource(
  analytics: AnalyticsAccountBalanceSnapshotReader,
): AccountBalanceFactSourcePort {
  return {
    async listAccountBalanceFacts(query: AccountBalanceFactQuery) {
      const result = await analytics.analyticsGetAccountBalanceSnapshot({
        asOfLocalDateExclusive: accountBalanceCutoffForPeriod(query.period),
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
