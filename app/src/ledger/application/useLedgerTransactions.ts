import { useCallback } from 'react';
import type { LedgerListTransactionsInput } from '../../shared/domain/corePort';
import type { LedgerGatewayPort } from '../infrastructure/ledgerGateway';

export function useLedgerTransactions(gateway: LedgerGatewayPort) {
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
