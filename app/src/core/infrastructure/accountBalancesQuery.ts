import type {
  AccountBalanceItem,
  AccountsListBalancesResult,
} from '../../account/application/accountBalances.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerListAccountsResult,
} from '../../ledger/application/ledger.port';

export type AccountBalancesQueryPort = {
  preferencesGet(): Promise<UserPreferencesResult>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
};

function sortDefaultFirst(items: AccountBalanceItem[]): AccountBalanceItem[] {
  return [...items].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
}

export async function listAccountBalances(port: AccountBalancesQueryPort): Promise<AccountsListBalancesResult> {
  const [accounts, preferences] = await Promise.all([
    port.ledgerListAccounts(),
    port.preferencesGet(),
  ]);
  const items = await Promise.all(accounts.items.map(async (account) => {
    const summary = await port.ledgerGetAccountSummary({ accountId: account.id });
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      status: account.status,
      balanceAmount: summary.balanceAmount,
      isDefault: preferences.defaultAccountId === account.id,
    };
  }));

  return { items: sortDefaultFirst(items) };
}
