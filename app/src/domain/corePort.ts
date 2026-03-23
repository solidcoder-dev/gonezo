export type CoreResult = {
  status: 'ok' | 'error';
  message: string;
};

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
  type: 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';
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

export type TaxonomyCategoryAppliesTo = 'income' | 'expense';

export type TaxonomyCategoryStatus = 'active' | 'archived';

export type TaxonomyCategoryItem = {
  id: string;
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
  status: TaxonomyCategoryStatus;
};

export type TaxonomyListCategoriesInput = {
  appliesTo?: TaxonomyCategoryAppliesTo;
  includeArchived?: boolean;
};

export type TaxonomyListCategoriesResult = {
  items: TaxonomyCategoryItem[];
};

export type TaxonomyCreateCategoryInput = {
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
};

export type TaxonomyCreateCategoryResult = {
  id: string;
};

export type TaxonomyTagStatus = 'active' | 'archived';

export type TaxonomyTagItem = {
  id: string;
  name: string;
  status: TaxonomyTagStatus;
};

export type TaxonomyListTagsInput = {
  includeArchived?: boolean;
};

export type TaxonomyListTagsResult = {
  items: TaxonomyTagItem[];
};

export type MobillsImportPolicy = {
  createMissingAccounts?: boolean;
  createMissingCategories?: boolean;
  createMissingTags?: boolean;
  defaultAccountType?: 'cash' | 'checking' | 'savings' | 'credit';
  duplicatePolicy?: 'skip' | 'fail' | 'import_anyway';
};

export type MobillsImportInput = {
  fileBase64: string;
  policy?: MobillsImportPolicy;
};

export type MobillsImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type MobillsImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: MobillsImportRowResult[];
};

export type OrchestrationCategorizeTransactionInput = {
  transactionId: string;
  transactionType: TaxonomyCategoryAppliesTo;
  categoryId?: string;
};

export type OrchestrationCategorizeTransactionResult = {
  status: 'assigned' | 'failed' | 'none';
  categoryId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type OrchestrationApplyTransactionTagsInput = {
  transactionId: string;
  tagNames: string[];
};

export type OrchestrationApplyTransactionTagsResult = {
  status: 'assigned' | 'failed' | 'none';
  tagIds?: string[];
  errorCode?: string;
  errorMessage?: string;
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult>;
  ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult>;
  ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
  orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
}
