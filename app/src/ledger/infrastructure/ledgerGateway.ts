import type { LedgerAccountItem, LedgerTransactionListItem } from '../../domain/corePort';

export type LedgerGatewayPort = {
  ledgerListSupportedCurrencies(): Promise<{ items: string[] }>;
  ledgerListAccounts(): Promise<{ items: LedgerAccountItem[] }>;
  ledgerGetAccountSummary(input: { accountId: string }): Promise<{
    accountId: string;
    name: string;
    type: string;
    currency: string;
    balanceAmount: string;
  }>;
  ledgerListTransactions(input: {
    accountId: string;
    limit?: number;
    includeVoided?: boolean;
  }): Promise<{ items: LedgerTransactionListItem[] }>;
  ledgerOpenAccount(input: {
    name: string;
    type?: string;
    currency: string;
    createdAt?: string;
    openingBalanceAmount?: string;
  }): Promise<{ id: string }>;
  ledgerRenameAccount(input: { accountId: string; name: string }): Promise<void>;
  ledgerArchiveAccount(input: { accountId: string; archivedAt?: string }): Promise<void>;
  ledgerDeleteAccount(input: { accountId: string }): Promise<void>;
  ledgerRecordExpense(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerRecordIncome(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerRecordTransfer(input: {
    fromAccountId: string;
    toAccountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
  }): Promise<{ transferOutId: string; transferInId: string }>;
  ledgerCreateExpenseDraft(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerAddTransactionItem(input: {
    transactionId: string;
    name: string;
    amount: string;
    currency: string;
    note?: string;
  }): Promise<void>;
  ledgerPostDraftTransaction(input: { transactionId: string }): Promise<void>;
  ledgerVoidTransaction(input: { transactionId: string }): Promise<void>;
};

export function createLedgerGateway(core: LedgerGatewayPort): LedgerGatewayPort {
  return {
    ledgerListSupportedCurrencies: core.ledgerListSupportedCurrencies,
    ledgerListAccounts: core.ledgerListAccounts,
    ledgerGetAccountSummary: core.ledgerGetAccountSummary,
    ledgerListTransactions: core.ledgerListTransactions,
    ledgerOpenAccount: core.ledgerOpenAccount,
    ledgerRenameAccount: core.ledgerRenameAccount,
    ledgerArchiveAccount: core.ledgerArchiveAccount,
    ledgerDeleteAccount: core.ledgerDeleteAccount,
    ledgerRecordExpense: core.ledgerRecordExpense,
    ledgerRecordIncome: core.ledgerRecordIncome,
    ledgerRecordTransfer: core.ledgerRecordTransfer,
    ledgerCreateExpenseDraft: core.ledgerCreateExpenseDraft,
    ledgerAddTransactionItem: core.ledgerAddTransactionItem,
    ledgerPostDraftTransaction: core.ledgerPostDraftTransaction,
    ledgerVoidTransaction: core.ledgerVoidTransaction,
  };
}
