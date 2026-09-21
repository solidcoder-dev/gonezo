import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { MacroAccountTypeCode } from './macroAccountTypeCode';

export type AccountBalanceFact = Readonly<{
  asOfLocalDateExclusive: string;
  accountType: MacroAccountTypeCode;
  currency: string;
  balanceAmount: string;
}>;

export function createAccountBalanceFact(input: AccountBalanceFact): AccountBalanceFact {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.asOfLocalDateExclusive)
    ? new Date(`${input.asOfLocalDateExclusive}T00:00:00.000Z`)
    : null;
  if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.asOfLocalDateExclusive) {
    throw new Error('Account balance fact cutoff must be a valid YYYY-MM-DD date');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Account balance fact currency must be uppercase');
  if (!['BANK', 'CASH', 'CARD', 'WALLET', 'SAVINGS', 'OTHER'].includes(input.accountType)) {
    throw new Error('Account balance fact account type must be canonical');
  }
  ExactDecimal.from(input.balanceAmount);
  return Object.freeze({
    asOfLocalDateExclusive: input.asOfLocalDateExclusive,
    accountType: input.accountType,
    currency: input.currency,
    balanceAmount: input.balanceAmount,
  });
}
