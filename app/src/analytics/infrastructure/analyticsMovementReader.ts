import type {
  LedgerListAccountsResult,
  LedgerTransactionFilterInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
} from '../../ledger/application/ledger.port';
import type { AnalyticsSharedAmountMode } from '../application/analyticsFilters';
import type { SharingListMovementDetailsInput, SharingListMovementDetailsResult } from '../../sharing/application/sharing.port';

export type AnalyticsMovementReaderPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
};

export type AnalyticsTransactionReadModel = LedgerTransactionListItem & {
  analyticsAmount: string;
  analyticsPersonalAmount: string;
  analyticsFullAmount: string;
};

export type AnalyticsMovementReadModel = {
  accounts: LedgerListAccountsResult['items'];
  transactions: AnalyticsTransactionReadModel[];
};

export type AnalyticsMovementReadScope = {
  accountIds?: string[];
  filters?: LedgerTransactionFilterInput;
  includeIgnoredMovements?: boolean;
  sharedAmountMode?: AnalyticsSharedAmountMode;
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
  includeIgnoredMovements: boolean,
): boolean {
  return includeIgnoredMovements || movement.ignored !== true;
}

function attributedAmount(
  movement: LedgerTransactionListItem,
  sharingDetailsByTransactionId: ReadonlyMap<string, SharingListMovementDetailsResult['items'][number]>,
  sharedAmountMode: AnalyticsSharedAmountMode,
) {
  const details = sharingDetailsByTransactionId.get(movement.id);
  const personalAmount = details?.analytics.personalExpenseAmount ?? movement.amount;
  const fullAmount = movement.amount;
  return {
    analyticsAmount: sharedAmountMode === 'full' ? fullAmount : personalAmount,
    analyticsPersonalAmount: personalAmount,
    analyticsFullAmount: fullAmount,
  };
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
  const transactions = pages.flat().filter((movement) => isAnalyticsIncludedMovement(
    movement,
    scope.includeIgnoredMovements === true,
  ));
  const sharedExpenseIds = transactions
    .filter((movement) => movement.type === 'expense')
    .map((movement) => movement.id);
  const sharingDetails = sharedExpenseIds.length > 0
    ? await port.sharingListMovementDetails({ transactionIds: sharedExpenseIds })
    : { items: [] };
  const sharingDetailsByTransactionId = new Map(sharingDetails.items.map((item) => [item.transactionId, item]));

  return {
    accounts: scopedAccounts,
    transactions: transactions.map((movement) => ({
      ...movement,
      ...attributedAmount(
        movement,
        sharingDetailsByTransactionId,
        scope.sharedAmountMode ?? 'personal',
      ),
    })),
  };
}
