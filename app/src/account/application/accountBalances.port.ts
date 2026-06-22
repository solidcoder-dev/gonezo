import type { LedgerNetWorthTrendPoint } from '../../ledger/application/ledger.port';

export type AccountBalanceItem = {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  status: string;
  balanceAmount: string;
  trend?: LedgerNetWorthTrendPoint[];
  isDefault: boolean;
};

export type AccountsListBalancesResult = {
  items: AccountBalanceItem[];
};

export type AccountBalancesPort = {
  accountsListBalances(): Promise<AccountsListBalancesResult>;
};
