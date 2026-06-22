import { buildCashFlowSeries } from '../application/cashFlowSeries';
import type {
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
  LedgerListTransactionsInput,
  LedgerListAccountsResult,
  LedgerListTransactionsResult,
} from '../application/ledger.port';

type NativeCashFlowReader = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
};

async function listAllAccountTransactions(
  reader: NativeCashFlowReader,
  accountId: string,
): Promise<LedgerListTransactionsResult['content']> {
  const content: LedgerListTransactionsResult['content'] = [];
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const result = await reader.ledgerListTransactions({
      accountId,
      filters: { statuses: ['posted'] },
      pagination: { page, size: 100 },
      sort: [{ field: 'occurredAt', direction: 'desc' }],
    });
    content.push(...result.content);
    hasNext = result.hasNext && result.content.length > 0;
    page += 1;
  }

  return content;
}

export async function getNativeCashFlowSeries(
  reader: NativeCashFlowReader,
  input: LedgerGetCashFlowSeriesInput,
): Promise<LedgerGetCashFlowSeriesResult> {
  const accounts = await reader.ledgerListAccounts();
  const transactionResults = await Promise.all(
    accounts.items.map((account) => listAllAccountTransactions(reader, account.id)),
  );

  return buildCashFlowSeries({
    accounts: accounts.items,
    transactions: transactionResults.flat(),
    currency: input.currency,
    granularity: input.granularity,
    periodOffset: input.periodOffset,
    now: new Date(),
  });
}
