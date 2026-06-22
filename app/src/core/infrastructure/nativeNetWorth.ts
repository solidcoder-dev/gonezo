import type {
  LedgerGetNetWorthByCurrencyResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerListAccountsResult,
} from '../../ledger/application/ledger.port';
import { buildNetWorthByCurrency } from '../../ledger/application/netWorthByCurrency';

export type NativeNetWorthPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
};

async function listAllAccountTransactions(
  port: NativeNetWorthPort,
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

export async function getNativeNetWorthByCurrency(
  port: NativeNetWorthPort,
  defaultAccountId?: string | null,
): Promise<LedgerGetNetWorthByCurrencyResult> {
  const accounts = await port.ledgerListAccounts();
  const defaultAccount = defaultAccountId
    ? accounts.items.find((account) => account.id === defaultAccountId)
    : undefined;
  const transactionResults = await Promise.all(
    accounts.items.map((account) => listAllAccountTransactions(port, account.id)),
  );

  return {
    items: buildNetWorthByCurrency({
      accounts: accounts.items,
      transactions: transactionResults.flat(),
      preferredCurrency: defaultAccount?.currency,
      now: new Date(),
    }),
  };
}
