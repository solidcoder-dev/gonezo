export type CoreResult = {
  status: 'ok' | 'error';
  message: string;
};

export type LedgerOpenAccountInput = {
  name: string;
  type?: string;
  currency?: string;
  createdAt?: string;
};

export type LedgerOpenAccountResult = {
  id: string;
};

export type LedgerRenameAccountInput = {
  accountId: string;
  name: string;
};

export type LedgerArchiveAccountInput = {
  accountId: string;
  archivedAt?: string;
};

export type LedgerAccountItem = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: string;
};

export type LedgerListAccountsResult = {
  items: LedgerAccountItem[];
};

export type LedgerGetAccountSummaryInput = {
  accountId: string;
};

export type LedgerGetAccountSummaryResult = {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  balanceAmount: string;
};

export type LedgerRecordExpenseInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerRecordExpenseResult = {
  id: string;
};

export type LedgerRecordIncomeInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerRecordIncomeResult = {
  id: string;
};

export type LedgerCreateExpenseDraftInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerCreateExpenseDraftResult = {
  id: string;
};

export type LedgerAddTransactionItemInput = {
  transactionId: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

export type LedgerPostDraftTransactionInput = {
  transactionId: string;
};

export type LedgerVoidTransactionInput = {
  transactionId: string;
};

export type LedgerListTransactionsInput = {
  accountId: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  merchant?: string;
  includeVoided?: boolean;
};

export type LedgerTransactionBreakdownItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

export type LedgerTransactionListItem = {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'draft' | 'posted' | 'voided';
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  items: LedgerTransactionBreakdownItem[];
};

export type LedgerListTransactionsResult = {
  items: LedgerTransactionListItem[];
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
}
