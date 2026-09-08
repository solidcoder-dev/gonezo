import { describe, expect, it } from 'vitest';
import { addDecimalAmounts, subtractDecimalAmounts } from './decimalAmount';

describe('decimal amounts', () => {
  it('adds amounts without floating-point rounding', () => {
    expect(addDecimalAmounts('0.10', '0.20')).toBe('0.30');
  });

  it('subtracts amounts without floating-point rounding', () => {
    expect(subtractDecimalAmounts('1.00', '0.90')).toBe('0.10');
  });
});
