import type { LedgerListTransactionsInput, LedgerListTransactionsResult } from '../../shared/domain/corePort';

export type TransactionsGatewayPort = {
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  ledgerVoidTransaction(input: { transactionId: string }): Promise<void>;
};

export function createTransactionsGateway(core: TransactionsGatewayPort): TransactionsGatewayPort {
  return {
    ledgerListTransactions: core.ledgerListTransactions,
    ledgerVoidTransaction: core.ledgerVoidTransaction,
  };
}
