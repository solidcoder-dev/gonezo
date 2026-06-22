import type {
  AccountBalanceItem,
  AccountsListBalancesResult,
} from '../../account/application/accountBalances.port';
import type { UserPreferencesResult } from '../../account/application/preferences.port';
import type {
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerListAccountsResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../ledger/application/ledger.port';
import { buildAccountBalanceTrend } from '../../ledger/application/accountBalanceTrend';

export type AccountBalancesQueryPort = {
  preferencesGet(): Promise<UserPreferencesResult>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
};

function sortDefaultFirst(items: AccountBalanceItem[]): AccountBalanceItem[] {
  return [...items].sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
}

async function listAllAccountTransactions(
  port: AccountBalancesQueryPort,
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

export async function listAccountBalances(port: AccountBalancesQueryPort): Promise<AccountsListBalancesResult> {
  const [accounts, preferences] = await Promise.all([
    port.ledgerListAccounts(),
    port.preferencesGet(),
  ]);
  const items = await Promise.all(accounts.items.map(async (account) => {
    const [summary, transactions] = await Promise.all([
      port.ledgerGetAccountSummary({ accountId: account.id }),
      listAllAccountTransactions(port, account.id),
    ]);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      status: account.status,
      balanceAmount: summary.balanceAmount,
      trend: buildAccountBalanceTrend({ transactions, now: new Date() }),
      isDefault: preferences.defaultAccountId === account.id,
    };
  }));

  return { items: sortDefaultFirst(items) };
}
