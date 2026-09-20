import type { LedgerTransactionListItem } from '../../../ledger/application/ledger.port';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsOverviewHighlight } from '../analytics.port';
import { isAnalyticsCashFlowTransaction } from '../analyticsBuilders';

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
    amount: 'analyticsAmount' in transaction && typeof transaction.analyticsAmount === 'string'
      ? transaction.analyticsAmount
      : transaction.amount,
    occurredAt: transaction.occurredAt,
  };
}

export function buildOverviewMovementHighlights(transactions: LedgerTransactionListItem[], currency: string) {
  const biggest = (type: 'income' | 'expense') => toAnalyticsHighlight(transactions
    .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && transaction.type === type)
    .sort((left, right) => {
      const leftAmount = 'analyticsAmount' in left && typeof left.analyticsAmount === 'string' ? left.analyticsAmount : left.amount;
      const rightAmount = 'analyticsAmount' in right && typeof right.analyticsAmount === 'string' ? right.analyticsAmount : right.amount;
      return ExactDecimal.from(rightAmount).compare(ExactDecimal.from(leftAmount));
    })[0]);
  return { biggestExpense: biggest('expense'), biggestIncome: biggest('income') };
}
