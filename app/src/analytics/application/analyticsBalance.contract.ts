import type { LedgerAccountType } from '../../ledger/application/ledger.port';

export type AnalyticsAccountBalanceSnapshotInput = {
  asOfLocalDateExclusive: string;
  zoneId: string;
  currency?: string;
};

export type AnalyticsAccountBalanceSnapshotItem = {
  accountId: string;
  accountType: LedgerAccountType;
  currency: string;
  balanceAmount: string;
};

export type AnalyticsAccountBalanceSnapshotResult = {
  asOfLocalDateExclusive: string;
  zoneId: string;
  items: readonly AnalyticsAccountBalanceSnapshotItem[];
};

export type AnalyticsAccountBalanceCoverageResult = { firstAccountLocalDate?: string };
