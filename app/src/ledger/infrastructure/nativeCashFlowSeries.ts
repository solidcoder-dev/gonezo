import { buildCashFlowSeries } from '../application/cashFlowSeries';
import type {
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
  LedgerListAccountsResult,
  LedgerListTransactionsResult,
} from '../application/ledger.port';

type NativeCashFlowReader = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: {
    accountId: string;
    pagination?: { page?: number; size?: number };
  }): Promise<LedgerListTransactionsResult>;
};

export async function getNativeCashFlowSeries(
  reader: NativeCashFlowReader,
  input: LedgerGetCashFlowSeriesInput,
): Promise<LedgerGetCashFlowSeriesResult> {
  const accounts = await reader.ledgerListAccounts();
  const transactionResults = await Promise.all(
    accounts.items.map((account) => reader.ledgerListTransactions({
      accountId: account.id,
      pagination: { page: 0, size: 500 },
    })),
  );

  return buildCashFlowSeries({
    accounts: accounts.items,
    transactions: transactionResults.flatMap((result) => result.content),
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    now: new Date(),
  });
}
