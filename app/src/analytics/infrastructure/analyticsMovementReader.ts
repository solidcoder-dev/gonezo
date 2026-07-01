import type {
  LedgerListAccountsResult,
  LedgerTransactionFilterInput,
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

export type AnalyticsMovementReadScope = {
  accountIds?: string[];
  filters?: LedgerTransactionFilterInput;
};

async function listAllAccountTransactions(
  port: AnalyticsMovementReaderPort,
  accountId: string,
  filters?: LedgerTransactionFilterInput,
): Promise<LedgerListTransactionsResult['content']> {
  const content: LedgerListTransactionsResult['content'] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const result = await port.ledgerListTransactions({
      accountId,
      filters: { statuses: ['posted'], ...filters },
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
  scope: AnalyticsMovementReadScope = {},
): Promise<AnalyticsMovementReadModel> {
  const accounts = await port.ledgerListAccounts();
  const requestedAccountIds = scope.accountIds && scope.accountIds.length > 0
    ? new Set(scope.accountIds)
    : null;
  const scopedAccounts = requestedAccountIds
    ? accounts.items.filter((account) => requestedAccountIds.has(account.id))
    : accounts.items;
  const pages = await Promise.all(
    scopedAccounts.map((account) => listAllAccountTransactions(port, account.id, scope.filters)),
  );
  return {
    accounts: scopedAccounts,
    transactions: pages.flat().filter(isAnalyticsIncludedMovement),
  };
}
