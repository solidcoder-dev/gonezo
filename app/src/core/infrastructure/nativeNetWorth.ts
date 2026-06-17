import type {
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerGetNetWorthByCurrencyResult,
  LedgerListAccountsResult,
} from '../../ledger/application/ledger.port';
import { sortNetWorthCurrencies } from '../../ledger/application/netWorthOrdering';

export type NativeNetWorthPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
};

export async function getNativeNetWorthByCurrency(
  port: NativeNetWorthPort,
  defaultAccountId?: string | null,
): Promise<LedgerGetNetWorthByCurrencyResult> {
  const accounts = await port.ledgerListAccounts();
  const balanceByCurrency = new Map<string, number>();
  const defaultAccount = defaultAccountId
    ? accounts.items.find((account) => account.id === defaultAccountId)
    : undefined;

  for (const account of accounts.items) {
    const summary = await port.ledgerGetAccountSummary({ accountId: account.id });
    balanceByCurrency.set(
      summary.currency,
      (balanceByCurrency.get(summary.currency) ?? 0) + Number(summary.balanceAmount),
    );
  }

  return {
    items: sortNetWorthCurrencies(
      [...balanceByCurrency.entries()]
        .map(([currency, balanceAmount]) => ({ currency, balanceAmount: balanceAmount.toFixed(2) })),
      defaultAccount?.currency,
    ),
  };
}
