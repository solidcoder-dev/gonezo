export type LedgerOpenAccountInput = {
  name: string;
  type?: string;
  currency: string;
  createdAt?: string;
  openingBalanceAmount?: string;
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

export type LedgerRestoreAccountInput = {
  accountId: string;
};

export type LedgerDeleteAccountInput = {
  accountId: string;
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

export type LedgerListSupportedCurrenciesResult = {
  items: string[];
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

export type LedgerRecordTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
};

export type LedgerRecordTransferResult = {
  transferOutId: string;
  transferInId: string;
};

export type LedgerRecordTransferFxInput = {
  fromAccountId: string;
  toAccountId: string;
  occurredAt: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  exchangeRate?: string;
  description?: string;
};

export type LedgerRecordTransferFxResult = {
  transferOutId: string;
  transferInId: string;
};

export type LedgerCreateExpenseDraftInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  type?: 'expense' | 'income';
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

export type LedgerTransactionType = 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';

export type LedgerTransactionStatus = 'draft' | 'posted' | 'voided';

export type LedgerTransactionFilterInput = {
  text?: string;
  merchant?: string;
  categoryId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  amountMin?: string;
  amountMax?: string;
  fromDate?: string;
  toDate?: string;
  statuses?: LedgerTransactionStatus[];
  types?: LedgerTransactionType[];
};

export type LedgerTransactionSortField = 'occurredAt' | 'amount';

export type LedgerSortDirection = 'asc' | 'desc';

export type LedgerTransactionSortInput = {
  field: LedgerTransactionSortField;
  direction: LedgerSortDirection;
};

export type LedgerPageRequestInput = {
  page?: number;
  size?: number;
};

export type LedgerListTransactionsInput = {
  accountId: string;
  filters?: LedgerTransactionFilterInput;
  pagination?: LedgerPageRequestInput;
  sort?: LedgerTransactionSortInput[];
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
  accountName?: string;
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  linkedTransactionId?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  tags?: Array<{
    id: string;
    name: string;
  }>;
  categorizationStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
  taggingStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
  items: LedgerTransactionBreakdownItem[];
};

export type LedgerListTransactionsResult = {
  content: LedgerTransactionListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export interface LedgerPort {
  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult>;
  ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void>;
  ledgerRestoreAccount(input: LedgerRestoreAccountInput): Promise<void>;
  ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult>;
  ledgerRecordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult>;
  ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
}
