import { useCallback } from 'react';
import type { LedgerListTransactionsInput } from './ledger.port';
import type { LedgerTransactionOperationsPort } from './ledgerTransactionOperations.port';

export type { LedgerTransactionOperationsPort } from './ledgerTransactionOperations.port';

export function useLedgerTransactions(gateway: LedgerTransactionOperationsPort) {
  const listTransactions = useCallback(
    (input: LedgerListTransactionsInput) => gateway.ledgerListTransactions(input),
    [gateway],
  );

  const voidTransaction = useCallback(
    (input: { transactionId: string }) => gateway.ledgerVoidTransaction(input),
    [gateway],
  );

  return {
    listTransactions,
    voidTransaction,
  };
}
