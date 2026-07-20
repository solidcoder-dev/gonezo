import type {
  LedgerAccountItem,
  LedgerNetWorthCurrencyItem,
  LedgerTransactionListItem,
} from './ledger.port';
import { buildAccountBalanceTrend, ledgerTransactionBalanceDelta } from './accountBalanceTrend';
import { sortNetWorthCurrencies } from './netWorthOrdering';
import { addDecimalAmounts } from './decimalAmount';

type BuildNetWorthByCurrencyInput = {
  accounts: LedgerAccountItem[];
  transactions: LedgerTransactionListItem[];
  preferredCurrency?: string;
  now: Date;
};

export function buildNetWorthByCurrency(input: BuildNetWorthByCurrencyInput): LedgerNetWorthCurrencyItem[] {
  const currencies = new Set(input.accounts.map((account) => account.currency.toUpperCase()));
  const balanceByCurrency = new Map<string, string>();
  const trendByCurrency = new Map<string, LedgerNetWorthCurrencyItem['trend']>();

  for (const currency of currencies) {
    const currencyTransactions = input.transactions.filter((transaction) => transaction.currency.toUpperCase() === currency);
    const balanceAmount = currencyTransactions.reduce(
      (total, transaction) => addDecimalAmounts(total, ledgerTransactionBalanceDelta(transaction)),
      '0.00',
    );
    balanceByCurrency.set(currency, balanceAmount);
    const trend = buildAccountBalanceTrend({ transactions: currencyTransactions, now: input.now });
    if (trend) {
      trendByCurrency.set(currency, trend);
    }
  }

  return sortNetWorthCurrencies(
    [...balanceByCurrency.entries()].map(([currency, balanceAmount]) => ({
      currency,
      balanceAmount,
      accountCount: input.accounts.filter((account) => account.currency.toUpperCase() === currency).length,
      isPreferred: currency === input.preferredCurrency?.toUpperCase(),
      trend: trendByCurrency.get(currency),
    })),
    input.preferredCurrency,
  );
}
