import type { LedgerNetWorthCurrencyItem } from './ledger.port';

function compareNetWorthCurrency(
  preferredCurrency: string | undefined,
  left: LedgerNetWorthCurrencyItem,
  right: LedgerNetWorthCurrencyItem,
): number {
  if (preferredCurrency) {
    if (left.currency === preferredCurrency && right.currency !== preferredCurrency) {
      return -1;
    }
    if (right.currency === preferredCurrency && left.currency !== preferredCurrency) {
      return 1;
    }
  }
  return left.currency.localeCompare(right.currency);
}

export function sortNetWorthCurrencies(
  items: LedgerNetWorthCurrencyItem[],
  preferredCurrency?: string,
): LedgerNetWorthCurrencyItem[] {
  return [...items].sort((left, right) => compareNetWorthCurrency(preferredCurrency, left, right));
}
