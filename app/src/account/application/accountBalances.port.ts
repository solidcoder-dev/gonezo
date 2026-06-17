export type AccountBalanceItem = {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  status: string;
  balanceAmount: string;
  isDefault: boolean;
};

export type AccountsListBalancesResult = {
  items: AccountBalanceItem[];
};

export type AccountBalancesPort = {
  accountsListBalances(): Promise<AccountsListBalancesResult>;
};
