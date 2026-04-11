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
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
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

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceMonthlyPattern = 'day_of_month' | 'nth_weekday';

export type RecurrenceRuleInput = {
  frequency: RecurrenceFrequency;
  interval?: number;
  weeklyDays?: number[];
  monthlyPattern?: RecurrenceMonthlyPattern;
  dayOfMonth?: number;
  monthlyWeekOrdinal?: number;
  monthlyWeekday?: number;
};

export type RecurrenceEndInput =
  | {
    kind: 'never';
  }
  | {
    kind: 'on_date';
    onDate: string;
  }
  | {
    kind: 'after_occurrences';
    afterOccurrences: number;
  };

export type RecurrenceCreateRecurringMovementInput = {
  type: 'expense' | 'income' | 'transfer';
  sourceAccountId: string;
  targetAccountId?: string;
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
  description?: string;
  merchant?: string;
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
  startAt: string;
  zoneId: string;
};

export type RecurrenceCreateRecurringMovementResult = {
  id: string;
};

export type RecurrenceDeactivateRecurringMovementInput = {
  recurringMovementId: string;
  deactivatedAt?: string;
};

export type RecurrenceListRecurringMovementsInput = {
  sourceAccountId: string;
};

export type RecurrenceMovementItem = {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  sourceAccountId: string;
  targetAccountId?: string;
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
  description?: string;
  merchant?: string;
  status: 'active' | 'deactivated' | 'completed';
  startAt: string;
  nextDueAt?: string;
  zoneId: string;
  generatedOccurrences: number;
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
};

export type RecurrenceListRecurringMovementsResult = {
  items: RecurrenceMovementItem[];
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

export type OrchestrationListTransactionTaxonomyInput = {
  transactionIds: string[];
};

export type OrchestrationTransactionTaxonomyItem = {
  transactionId: string;
  categoryId?: string;
  tagIds?: string[];
  categorizationStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
  taggingStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
};

export type OrchestrationListTransactionTaxonomyResult = {
  items: OrchestrationTransactionTaxonomyItem[];
};

export type TransactionVoiceType = 'expense' | 'income' | 'transfer';

export type TransactionVoiceDraft = {
  type: TransactionVoiceType;
  amount?: string;
  currency?: string;
  occurredAt?: string;
  note?: string;
  transferToAccountId?: string;
  categoryName?: string;
  tagNames?: string[];
};

export type TransactionVoiceStartInput = {
  accountId: string;
  expectedType: TransactionVoiceType;
};

export type TransactionVoiceStartResult = {
  sessionId: string;
  recordingId: string;
  recordingPath: string;
  startedAt: string;
};

export type TransactionVoiceStopInput = {
  sessionId: string;
};

export type TransactionVoiceStopResult = {
  sessionId: string;
  recordingId: string;
  recordingPath: string;
  stoppedAt: string;
  durationMs: number;
};

export type TransactionVoiceExtractDraftInput = {
  sessionId: string;
};

export type TransactionVoiceExtractDraftResult = {
  analysisId: string;
  sessionId: string;
  recording: {
    id: string;
    path: string;
    createdAt: string;
  };
  draft: TransactionVoiceDraft;
};

export type TransactionVoiceFinalizeInput = {
  analysisId: string;
  outcome: 'saved' | 'cancelled' | 'failed';
  transactionIds?: string[];
  finalDraft?: TransactionVoiceDraft;
  errorMessage?: string;
};

export type TransactionVoiceFinalizeResult = {
  analysisId: string;
  finalizedAt: string;
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult>;
  ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void>;
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
  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
  transactionVoiceStart(input: TransactionVoiceStartInput): Promise<TransactionVoiceStartResult>;
  transactionVoiceStop(input: TransactionVoiceStopInput): Promise<TransactionVoiceStopResult>;
  transactionVoiceExtractDraft(input: TransactionVoiceExtractDraftInput): Promise<TransactionVoiceExtractDraftResult>;
  transactionVoiceFinalize(input: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult>;
  recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
}
