import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import { isBalanceInflow, isBalanceOutflow } from '../../ledger/application/movementSemantics';

function isAutomaticOpeningBalance(transaction: LedgerTransactionListItem): boolean {
  return transaction.description?.trim().toLowerCase() === 'opening balance'
    && !transaction.merchant
    && !transaction.categoryId
    && transaction.items.length === 0;
}

export function isAnalyticsCashFlowTransaction(transaction: LedgerTransactionListItem, currency: string): boolean {
  return transaction.status === 'posted'
    && (isBalanceInflow(transaction.type) || isBalanceOutflow(transaction.type))
    && transaction.currency.toUpperCase() === currency
    && !isAutomaticOpeningBalance(transaction);
}
