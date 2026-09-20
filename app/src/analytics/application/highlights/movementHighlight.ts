import type { LedgerTransactionListItem } from '../../../ledger/application/ledger.port';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsOverviewHighlight } from '../analytics.port';

function analyticsAmount(transaction: LedgerTransactionListItem): string {
  return 'analyticsAmount' in transaction && typeof transaction.analyticsAmount === 'string'
    ? transaction.analyticsAmount
    : transaction.amount;
}

function title(transaction: LedgerTransactionListItem): string {
  return transaction.description?.trim()
    || transaction.merchant?.trim()
    || transaction.category?.name?.trim()
    || (transaction.type === 'expense' ? 'Expense' : 'Income');
}

export function toAnalyticsHighlight(transaction: LedgerTransactionListItem | undefined): AnalyticsOverviewHighlight | undefined {
  if (!transaction) return undefined;
  const description = transaction.description?.trim();
  const merchant = transaction.merchant?.trim();
  return {
    movementId: transaction.id,
    title: title(transaction),
    subtitle: description && merchant ? merchant : undefined,
    amount: analyticsAmount(transaction),
    occurredAt: transaction.occurredAt,
  };
}

export function compareAnalyticsAmountDescending(left: LedgerTransactionListItem, right: LedgerTransactionListItem): number {
  return ExactDecimal.from(analyticsAmount(right)).compare(ExactDecimal.from(analyticsAmount(left)));
}
