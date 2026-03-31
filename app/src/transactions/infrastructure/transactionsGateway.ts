import type { LedgerTransactionListItem } from '../../shared/domain/corePort';

export type TransactionsGatewayPort = {
  ledgerListTransactions(input: {
    accountId: string;
    limit?: number;
    includeVoided?: boolean;
  }): Promise<{ items: LedgerTransactionListItem[] }>;
  ledgerVoidTransaction(input: { transactionId: string }): Promise<void>;
};

export function createTransactionsGateway(core: TransactionsGatewayPort): TransactionsGatewayPort {
  return {
    ledgerListTransactions: core.ledgerListTransactions,
    ledgerVoidTransaction: core.ledgerVoidTransaction,
  };
}
