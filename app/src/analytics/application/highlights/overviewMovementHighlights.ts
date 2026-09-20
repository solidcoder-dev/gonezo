import type { LedgerTransactionListItem } from '../../../ledger/application/ledger.port';
import { isAnalyticsCashFlowTransaction } from '../analyticsMovementEligibility';
import { compareAnalyticsAmountDescending, toAnalyticsHighlight } from './movementHighlight';

export function buildOverviewMovementHighlights(transactions: LedgerTransactionListItem[], currency: string) {
  const biggest = (type: 'income' | 'expense') => toAnalyticsHighlight(transactions
    .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && transaction.type === type)
    .sort(compareAnalyticsAmountDescending)[0]);
  return { biggestExpense: biggest('expense'), biggestIncome: biggest('income') };
}
