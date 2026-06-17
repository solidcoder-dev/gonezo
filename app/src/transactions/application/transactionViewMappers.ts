import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { TransactionHistoryItemView } from './transactionView.types';

function toTransactionStatus(status: LedgerTransactionListItem['status']): TransactionHistoryItemView['status'] {
  if (status === 'draft') {
    return 'draft';
  }
  if (status === 'voided') {
    return 'voided';
  }
  return 'posted';
}

function toTransactionType(type: LedgerTransactionListItem['type']): TransactionHistoryItemView['type'] {
  if (type === 'income') {
    return 'income';
  }
  if (type === 'expense') {
    return 'expense';
  }
  if (type === 'transfer_in') {
    return 'transfer_in';
  }
  if (type === 'transfer_out') {
    return 'transfer_out';
  }
  return 'transfer';
}

export function mapTransactionHistoryList(input: LedgerTransactionListItem[]): TransactionHistoryItemView[] {
  return input.map((item) => ({
    id: item.id,
    accountId: item.accountId,
    accountName: item.accountName,
    occurredAt: item.occurredAt,
    description: item.description,
    merchant: item.merchant,
    amount: item.amount,
    currency: item.currency,
    type: toTransactionType(item.type),
    status: toTransactionStatus(item.status),
    categoryId: item.categoryId,
    category: item.category,
    tags: item.tags,
    categorizationStatus: item.categorizationStatus,
    taggingStatus: item.taggingStatus,
    items: item.items ?? [],
  }));
}
