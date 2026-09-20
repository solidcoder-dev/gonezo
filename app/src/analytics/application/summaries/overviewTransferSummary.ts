import type { LedgerTransactionListItem } from '../../../ledger/application/ledger.port';
import { addDecimalAmounts } from '../../../ledger/application/decimalAmount';
import { isBalanceInflow, isBalanceOutflow } from '../../../ledger/application/movementSemantics';
import { isAnalyticsCashFlowTransaction } from '../analyticsBuilders';

export function buildOverviewTransferSummary(transactions: LedgerTransactionListItem[], currency: string) {
  if (!transactions.some((transaction) => transaction.type === 'transfer_in' || transaction.type === 'transfer_out')) return {};
  return {
    inflowAmount: transactions
      .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && isBalanceInflow(transaction.type))
      .reduce((total, transaction) => addDecimalAmounts(total, 'analyticsAmount' in transaction && typeof transaction.analyticsAmount === 'string' ? transaction.analyticsAmount : transaction.amount), '0.00'),
    outflowAmount: transactions
      .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && isBalanceOutflow(transaction.type))
      .reduce((total, transaction) => addDecimalAmounts(total, 'analyticsAmount' in transaction && typeof transaction.analyticsAmount === 'string' ? transaction.analyticsAmount : transaction.amount), '0.00'),
  };
}
