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

export type UserPreferencesResult = {
  defaultAccountId: string | null;
};

export type PreferencesSetDefaultAccountInput = {
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

export type MovementsBackupPostedMovementItem = {
  id: string;
  accountId: string;
  type: LedgerTransactionType;
  status: 'posted';
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  linkedTransactionId?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  tagIds: string[];
  splitItems: LedgerTransactionBreakdownItem[];
};

export type MovementsBackupExport = {
  schemaVersion: 2;
  exportedAt: string;
  accounts: LedgerAccountItem[];
  categories: TaxonomyCategoryItem[];
  tags: TaxonomyTagItem[];
  postedMovements: MovementsBackupPostedMovementItem[];
};

export type MovementsBackupExportResult = {
  fileName: string;
  exportedAt: string;
  savedTo?: string;
  postedMovementCount: number;
  accountCount: number;
  categoryCount: number;
  tagCount: number;
};

export type MovementsBackupImportInput = {
  fileBase64: string;
};

export type MovementsBackupImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type MovementsBackupImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: MovementsBackupImportRowResult[];
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
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
  tagIds?: string[];
  tagNames?: string[];
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
  splitItems: Array<{ id: string; name: string; amount: string }>;
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
};

export type RecurrenceListRecurringMovementsResult = {
  items: RecurrenceMovementItem[];
};

export type SchedulingFrequency = RecurrenceFrequency;

export type SchedulingMonthlyPattern = RecurrenceMonthlyPattern;

export type SchedulingRuleInput = RecurrenceRuleInput;

export type SchedulingEndInput = RecurrenceEndInput;

export type SchedulingCreateMovementInput = RecurrenceCreateRecurringMovementInput & {
  scheduleKind?: 'recurring' | 'one_shot';
};

export type SchedulingCreateMovementResult = RecurrenceCreateRecurringMovementResult;

export type SchedulingUpdateMovementInput = SchedulingCreateMovementInput & {
  recurringMovementId: string;
};

export type SchedulingUpdateMovementResult = RecurrenceCreateRecurringMovementResult;

export type SchedulingDeactivateMovementInput = RecurrenceDeactivateRecurringMovementInput;

export type SchedulingListMovementsInput = RecurrenceListRecurringMovementsInput;

export type SchedulingMovementItem = RecurrenceMovementItem & {
  categoryId?: string;
  tagIds?: string[];
  tagNames?: string[];
  scheduleKind?: 'recurring' | 'one_shot';
  origin?: 'recurring' | 'one_shot';
};

export type SchedulingListMovementsResult = {
  items: SchedulingMovementItem[];
};

export type ExpectedCreateMovementInput = {
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
};

export type ExpectedCreateMovementResult = {
  id: string;
};

export type ExpectedUpdateMovementInput = {
  expectedMovementId: string;
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
};

export type ExpectedUpdateMovementResult = {
  id: string;
};

export type ExpectedMovementStatus = 'pending' | 'resolved' | 'dismissed';

export type ExpectedMovementItem = {
  id: string;
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  originOccurrenceId?: string;
  splitItems: Array<{ id: string; name: string; amount: string }>;
  status: ExpectedMovementStatus;
  resolvedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
};

export type ExpectedListMovementsInput = {
  accountId: string;
  includeClosed?: boolean;
};

export type ExpectedListMovementsResult = {
  items: ExpectedMovementItem[];
};

export type ExpectedResolveMovementInput = {
  expectedMovementId: string;
  transactionId: string;
  resolvedAt?: string;
};

export type ExpectedDismissMovementInput = {
  expectedMovementId: string;
  dismissedAt?: string;
};

export type MovementsMonthOverviewInput = {
  accountId: string;
  fromDate?: string;
  toDate?: string;
  postedPagination?: LedgerPageRequestInput;
  executedPagination?: LedgerPageRequestInput;
  scheduledPreviewSize?: number;
  expectedPreviewSize?: number;
  filters?: MovementsSearchFiltersInput;
  sort?: LedgerTransactionSortInput[];
};

export type MovementsMonthOverviewResult = {
  scheduledPreview: {
    items: SchedulingMovementItem[];
    total: number;
    hasMore: boolean;
  };
  expectedPreview: {
    items: ExpectedMovementItem[];
    total: number;
    hasMore: boolean;
  };
  postedPage: LedgerListTransactionsResult;
  executedPage: LedgerListTransactionsResult;
};

export type MovementsSearchSource = 'posted' | 'scheduled' | 'expected';

export type MovementsSearchFiltersInput = {
  text?: string;
  merchant?: string;
  categoryId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  amountMin?: string;
  amountMax?: string;
  fromDate?: string;
  toDate?: string;
  types?: LedgerTransactionType[];
  status?: 'all' | 'scheduled' | 'executed' | 'voided' | 'failed';
  origin?: 'all' | 'recurring' | 'one_shot' | 'manual';
};

export type MovementsSearchSortField = 'date' | 'amount';

export type MovementsSearchSortInput = {
  field: MovementsSearchSortField;
  direction: LedgerSortDirection;
};

export type MovementsSearchItem = {
  id: string;
  source: MovementsSearchSource;
  type: LedgerTransactionType;
  status: 'posted' | 'scheduled' | 'expected' | 'resolved' | 'dismissed' | 'voided' | 'failed' | 'deactivated';
  amount: string;
  currency: string;
  occurredAt: string;
  title: string;
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
  items?: Array<{
    id: string;
    name: string;
    amount: string;
  }>;
};

export type MovementsSearchInput = {
  accountId: string;
  source: MovementsSearchSource;
  filters?: MovementsSearchFiltersInput;
  pagination?: LedgerPageRequestInput;
  sort?: MovementsSearchSortInput[];
};

export type MovementsSearchResult = {
  content: MovementsSearchItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type MovementsSearchFacetsInput = {
  accountIds: string[];
};

export type MovementsSearchFacetCategory = {
  id: string;
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
};

export type MovementsSearchFacetTag = {
  id: string;
  name: string;
};

export type MovementsSearchFacetsResult = {
  categories: MovementsSearchFacetCategory[];
  tags: MovementsSearchFacetTag[];
};

export type MovementsOverviewFilterInput = MovementsSearchFiltersInput;
export type MovementsGetOverviewInput = MovementsMonthOverviewInput;
export type MovementsGetOverviewResult = MovementsMonthOverviewResult;

export type MovementsListScheduledInput = {
  accountId: string;
  filters?: MovementsOverviewFilterInput;
  pagination?: LedgerPageRequestInput;
  sort?: Array<{
    field: 'nextDueAt' | 'amount';
    direction: LedgerSortDirection;
  }>;
};

export type MovementsListScheduledResult = {
  content: SchedulingMovementItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
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

export type TaxonomyRenameCategoryInput = {
  categoryId: string;
  name: string;
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

export type TaxonomyRenameTagInput = {
  tagId: string;
  name: string;
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

export interface PreferencesCorePort {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
}

export interface LedgerCorePort {
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

export interface TaxonomyCorePort {
  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
  taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void>;
  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void>;
  orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
}

export interface MobillsImportCorePort {
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
}

export interface MovementsBackupCorePort {
  movementsExportBackup(): Promise<MovementsBackupExportResult>;
  movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult>;
}

export interface RecurrenceCorePort {
  recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
}

export interface SchedulingCorePort {
  schedulingCreateMovement(input: SchedulingCreateMovementInput): Promise<SchedulingCreateMovementResult>;
  schedulingUpdateMovement(input: SchedulingUpdateMovementInput): Promise<SchedulingUpdateMovementResult>;
  schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void>;
  schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult>;
}

export interface ExpectedCorePort {
  expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult>;
  expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult>;
  expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
  expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void>;
  expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void>;
}

export interface MovementsQueryCorePort {
  movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult>;
  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult>;
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
}

export interface CorePort
  extends PreferencesCorePort,
    LedgerCorePort,
    TaxonomyCorePort,
    MobillsImportCorePort,
    MovementsBackupCorePort,
    RecurrenceCorePort,
    SchedulingCorePort,
    ExpectedCorePort,
    MovementsQueryCorePort {}
