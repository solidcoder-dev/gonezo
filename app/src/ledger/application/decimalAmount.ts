import { ExactDecimal, addExactDecimals, subtractExactDecimals } from '../../shared/domain/exactDecimal';

export const addDecimalAmounts = addExactDecimals;
export const subtractDecimalAmounts = subtractExactDecimals;

export function isZeroDecimalAmount(value: string): boolean {
  return ExactDecimal.from(value).compare(ExactDecimal.from('0')) === 0;
}
