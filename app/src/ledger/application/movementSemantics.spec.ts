import { describe, expect, it } from 'vitest';
import {
  balanceImpact,
  isBalanceInflow,
  isBalanceOutflow,
  isEconomicExpense,
  isEconomicIncome,
} from './movementSemantics';

describe('movement balance semantics', () => {
  it.each([
    ['income', '100.00'],
    ['transfer_in', '100.00'],
  ] as const)('%s increases balance by its amount', (type, expected) => {
    expect(balanceImpact(type, '100.00')).toBe(expected);
    expect(isBalanceInflow(type)).toBe(true);
  });

  it.each([
    ['expense', '-100.00'],
    ['transfer_out', '-100.00'],
  ] as const)('%s decreases balance by its amount', (type, expected) => {
    expect(balanceImpact(type, '100.00')).toBe(expected);
    expect(isBalanceOutflow(type)).toBe(true);
  });

  it('keeps economic and balance semantics separate', () => {
    expect(isEconomicIncome('income')).toBe(true);
    expect(isEconomicExpense('expense')).toBe(true);
    expect(isEconomicIncome('transfer_in')).toBe(false);
    expect(isEconomicExpense('transfer_out')).toBe(false);
  });
});
