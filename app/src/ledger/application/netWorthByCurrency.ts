import type {
  LedgerAccountItem,
  LedgerNetWorthCurrencyItem,
  LedgerTransactionListItem,
} from './ledger.port';
import { buildAccountBalanceTrend, ledgerTransactionBalanceDelta } from './accountBalanceTrend';
import { sortNetWorthCurrencies } from './netWorthOrdering';

type BuildNetWorthByCurrencyInput = {
  accounts: LedgerAccountItem[];
  transactions: LedgerTransactionListItem[];
  preferredCurrency?: string;
  now: Date;
};

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

export function buildNetWorthByCurrency(input: BuildNetWorthByCurrencyInput): LedgerNetWorthCurrencyItem[] {
  const currencies = new Set(input.accounts.map((account) => account.currency.toUpperCase()));
  const balanceByCurrency = new Map<string, string>();
  const trendByCurrency = new Map<string, LedgerNetWorthCurrencyItem['trend']>();

  for (const currency of currencies) {
    const currencyTransactions = input.transactions.filter((transaction) => transaction.currency.toUpperCase() === currency);
    const balanceAmount = currencyTransactions.reduce(
      (total, transaction) => addAmount(total, ledgerTransactionBalanceDelta(transaction).toFixed(2)),
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
      trend: trendByCurrency.get(currency),
    })),
    input.preferredCurrency,
  );
}
