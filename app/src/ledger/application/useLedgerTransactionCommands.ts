import { useCallback } from 'react';
import type { LedgerGatewayPort } from '../infrastructure/ledgerGateway';

export function useLedgerTransactionCommands(gateway: LedgerGatewayPort) {
  const recordExpense = useCallback(
    (input: {
      accountId: string;
      occurredAt: string;
      amount: string;
      currency: string;
      description?: string;
      merchant?: string;
      categoryId?: string;
    }) => gateway.ledgerRecordExpense(input),
    [gateway],
  );

  const recordIncome = useCallback(
    (input: {
      accountId: string;
      occurredAt: string;
      amount: string;
      currency: string;
      description?: string;
      merchant?: string;
      categoryId?: string;
    }) => gateway.ledgerRecordIncome(input),
    [gateway],
  );

  const recordTransfer = useCallback(
    (input: {
      fromAccountId: string;
      toAccountId: string;
      occurredAt: string;
      amount: string;
      currency: string;
      description?: string;
    }) => gateway.ledgerRecordTransfer(input),
    [gateway],
  );

  const recordTransferFx = useCallback(
    (input: {
      fromAccountId: string;
      toAccountId: string;
      occurredAt: string;
      sourceAmount: string;
      sourceCurrency: string;
      destinationAmount: string;
      destinationCurrency: string;
      exchangeRate?: string;
      description?: string;
    }) => gateway.ledgerRecordTransferFx(input),
    [gateway],
  );

  const createExpenseDraft = useCallback(
    (input: {
      accountId: string;
      occurredAt: string;
      amount: string;
      currency: string;
      type?: 'expense' | 'income';
      description?: string;
      merchant?: string;
    }) => gateway.ledgerCreateExpenseDraft(input),
    [gateway],
  );

  const addTransactionItem = useCallback(
    (input: {
      transactionId: string;
      name: string;
      amount: string;
      currency: string;
      note?: string;
    }) => gateway.ledgerAddTransactionItem(input),
    [gateway],
  );

  const postDraftTransaction = useCallback(
    (input: { transactionId: string }) => gateway.ledgerPostDraftTransaction(input),
    [gateway],
  );

  return {
    recordExpense,
    recordIncome,
    recordTransfer,
    recordTransferFx,
    createExpenseDraft,
    addTransactionItem,
    postDraftTransaction,
  };
}
