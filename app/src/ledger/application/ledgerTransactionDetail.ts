import type { LedgerTransactionListItem } from './ledger.port';

type LedgerTransactionDetailState = {
  ledgerAccounts: Array<{ id: string; name: string }>;
  taxonomyCategories: Array<{ id: string; name: string }>;
  taxonomyTags: Array<{ id: string; name: string }>;
  analyticsExclusions: Array<{ scopeType: 'movement'; scopeId: string; reason: 'user_ignored' }>;
};

type WebLedgerTransaction = LedgerTransactionListItem & {
  categoryId?: string;
  items: Array<{ id: string; name: string; amount: string }>;
};

export function mapWebLedgerTransactionDetail(
  transaction: WebLedgerTransaction,
  state: LedgerTransactionDetailState,
  transactionTags: ReadonlyMap<string, readonly string[]>,
): LedgerTransactionListItem {
  const account = state.ledgerAccounts.find((item) => item.id === transaction.accountId);
  const category = transaction.categoryId
    ? state.taxonomyCategories.find((item) => item.id === transaction.categoryId)
    : undefined;
  const tags = (transactionTags.get(transaction.id) ?? [])
    .map((id) => state.taxonomyTags.find((tag) => tag.id === id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .map((tag) => ({ id: tag.id, name: tag.name }));
  const ignored = state.analyticsExclusions.some((item) => item.scopeType === 'movement' && item.scopeId === transaction.id && item.reason === 'user_ignored');
  return {
    ...transaction,
    accountName: account?.name,
    category: category ? { id: category.id, name: category.name } : undefined,
    tags,
    ignored,
    items: transaction.items.map((item) => ({ ...item })),
  };
}
