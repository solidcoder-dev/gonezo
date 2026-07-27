import type {
  LedgerListAccountsResult,
  LedgerTransactionFilterInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
} from '../../ledger/application/ledger.port';
import type { AnalyticsSharedAmountMode } from '../application/analyticsFilters';
import type { SharingListMovementDetailsInput, SharingListMovementDetailsResult } from '../../sharing/application/sharing.port';
import type { AnalyticsListMovementFactsResult } from '../application/analytics.port';

export type AnalyticsMovementReaderPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
  analyticsListMovementFacts?: (input: {
    fromLocalDate: string;
    toLocalDate: string;
    zoneId: string;
    currency?: string;
    includePlannedMovements?: boolean;
    includeIgnoredMovements?: boolean;
    accountIds?: string[];
    categoryId?: string;
    tagIds?: string[];
  }) => Promise<AnalyticsListMovementFactsResult>;
};

export type AnalyticsTransactionReadModel = LedgerTransactionListItem & {
  analyticsFactId?: string;
  reference?: AnalyticsListMovementFactsResult['items'][number]['reference'];
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
  filters?: LedgerTransactionFilterInput & { currency?: string; includePlannedMovements?: boolean };
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

function previousLocalDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
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

  const fromDate = scope.filters?.fromDate;
  const toDate = scope.filters?.toDate ?? scope.filters?.toDateExclusive;
  if (port.analyticsListMovementFacts && fromDate && toDate) {
    const result = await port.analyticsListMovementFacts({
      fromLocalDate: fromDate.slice(0, 10),
      toLocalDate: scope.filters?.toDateExclusive ? previousLocalDate(toDate) : toDate.slice(0, 10),
      zoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: scope.filters?.currency,
      includePlannedMovements: scope.filters?.includePlannedMovements !== false,
      includeIgnoredMovements: scope.includeIgnoredMovements === true,
      accountIds: scope.accountIds,
      categoryId: scope.filters?.categoryId,
      tagIds: scope.filters?.tagIds,
    });
    const selected = result.items;
    return {
      accounts: scopedAccounts,
      transactions: selected.map((movement) => ({
        id: movement.reference.source === 'posted' ? movement.reference.transactionId : movement.analyticsFactId,
        analyticsFactId: movement.analyticsFactId,
        reference: movement.reference,
        accountId: movement.accountId,
        type: movement.type,
        status: 'posted',
        amount: movement.fullAmount,
        currency: movement.currency,
        occurredAt: movement.effectiveAt,
        categoryId: movement.categoryId,
        ignored: movement.ignored,
        items: [],
        analyticsAmount: scope.sharedAmountMode === 'full' ? movement.fullAmount : movement.personalAmount,
        analyticsPersonalAmount: movement.personalAmount,
        analyticsFullAmount: movement.fullAmount,
      })),
    };
  }
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
      analyticsFactId: `posted/${movement.id}`,
      reference: { source: 'posted' as const, transactionId: movement.id },
      ...attributedAmount(
        movement,
        sharingDetailsByTransactionId,
        scope.sharedAmountMode ?? 'personal',
      ),
    })),
  };
}
