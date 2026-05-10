import type {
  LedgerAccountItem,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../shared/domain/corePort';

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
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  ledgerOpenAccount(input: {
    name: string;
    type?: string;
    currency: string;
    createdAt?: string;
    openingBalanceAmount?: string;
  }): Promise<{ id: string }>;
  ledgerRenameAccount(input: { accountId: string; name: string }): Promise<void>;
  ledgerArchiveAccount(input: { accountId: string; archivedAt?: string }): Promise<void>;
  ledgerRestoreAccount(input: { accountId: string }): Promise<void>;
  ledgerDeleteAccount(input: { accountId: string }): Promise<void>;
  ledgerRecordExpense(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
    categoryId?: string;
  }): Promise<{ id: string }>;
  ledgerRecordIncome(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
    categoryId?: string;
  }): Promise<{ id: string }>;
  ledgerRecordTransfer(input: {
    fromAccountId: string;
    toAccountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
  }): Promise<{ transferOutId: string; transferInId: string }>;
  ledgerRecordTransferFx(input: {
    fromAccountId: string;
    toAccountId: string;
    occurredAt: string;
    sourceAmount: string;
    sourceCurrency: string;
    destinationAmount: string;
    destinationCurrency: string;
    exchangeRate?: string;
    description?: string;
  }): Promise<{ transferOutId: string; transferInId: string }>;
  ledgerCreateExpenseDraft(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    type?: 'expense' | 'income';
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
    ledgerListSupportedCurrencies: () => core.ledgerListSupportedCurrencies(),
    ledgerListAccounts: () => core.ledgerListAccounts(),
    ledgerGetAccountSummary: (input) => core.ledgerGetAccountSummary(input),
    ledgerListTransactions: (input) => core.ledgerListTransactions(input),
    ledgerOpenAccount: (input) => core.ledgerOpenAccount(input),
    ledgerRenameAccount: (input) => core.ledgerRenameAccount(input),
    ledgerArchiveAccount: (input) => core.ledgerArchiveAccount(input),
    ledgerRestoreAccount: (input) => core.ledgerRestoreAccount(input),
    ledgerDeleteAccount: (input) => core.ledgerDeleteAccount(input),
    ledgerRecordExpense: (input) => core.ledgerRecordExpense(input),
    ledgerRecordIncome: (input) => core.ledgerRecordIncome(input),
    ledgerRecordTransfer: (input) => core.ledgerRecordTransfer(input),
    ledgerRecordTransferFx: (input) => core.ledgerRecordTransferFx(input),
    ledgerCreateExpenseDraft: (input) => core.ledgerCreateExpenseDraft(input),
    ledgerAddTransactionItem: (input) => core.ledgerAddTransactionItem(input),
    ledgerPostDraftTransaction: (input) => core.ledgerPostDraftTransaction(input),
    ledgerVoidTransaction: (input) => core.ledgerVoidTransaction(input),
  };
}
