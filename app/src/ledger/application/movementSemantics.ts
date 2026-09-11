import type { LedgerTransactionType } from './ledger.port';
import { addDecimalAmounts } from './decimalAmount';

export type BalanceMovementType = Exclude<LedgerTransactionType, 'transfer'>;

function balanceDirection(type: LedgerTransactionType): -1 | 0 | 1 {
  switch (type) {
    case 'income':
    case 'transfer_in':
      return 1;
    case 'expense':
    case 'transfer_out':
      return -1;
    case 'transfer':
      return 0;
    default:
      return 0;
  }
}

export function isEconomicIncome(type: LedgerTransactionType): boolean {
  return type === 'income';
}

export function isEconomicExpense(type: LedgerTransactionType): boolean {
  return type === 'expense';
}

export function isBalanceInflow(type: LedgerTransactionType): boolean {
  return balanceDirection(type) === 1;
}

export function isBalanceOutflow(type: LedgerTransactionType): boolean {
  return balanceDirection(type) === -1;
}

export function balanceImpact(type: LedgerTransactionType, amount: string): string {
  const direction = balanceDirection(type);
  if (direction === 0) {
    return '0.00';
  }
  return direction === 1 ? amount : addDecimalAmounts('0.00', `-${amount}`);
}
