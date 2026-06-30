import type {
  LedgerListAccountsResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../ledger/application/ledger.port';

export type AnalyticsMovementReaderPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
};

export type AnalyticsMovementReadModel = {
  accounts: LedgerListAccountsResult['items'];
  transactions: LedgerListTransactionsResult['content'];
};

async function listAllAccountTransactions(
  port: AnalyticsMovementReaderPort,
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

function isAnalyticsIncludedMovement(
  movement: LedgerListTransactionsResult['content'][number],
): boolean {
  return movement.ignored !== true;
}

export async function listAnalyticsMovements(
  port: AnalyticsMovementReaderPort,
): Promise<AnalyticsMovementReadModel> {
  const accounts = await port.ledgerListAccounts();
  const pages = await Promise.all(
    accounts.items.map((account) => listAllAccountTransactions(port, account.id)),
  );
  return {
    accounts: accounts.items,
    transactions: pages.flat().filter(isAnalyticsIncludedMovement),
  };
}
