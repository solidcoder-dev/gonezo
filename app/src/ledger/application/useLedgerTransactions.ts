import { useCallback } from 'react';
import type { LedgerGatewayPort } from '../infrastructure/ledgerGateway';

export function useLedgerTransactions(gateway: LedgerGatewayPort) {
  const listTransactions = useCallback(
    (input: { accountId: string; limit?: number; includeVoided?: boolean }) => gateway.ledgerListTransactions(input),
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
