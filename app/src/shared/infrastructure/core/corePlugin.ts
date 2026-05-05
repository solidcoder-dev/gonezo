import { registerPlugin } from '@capacitor/core';
import type {
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerDeleteAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerAddTransactionItemInput,
  LedgerPostDraftTransactionInput,
  LedgerVoidTransactionInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  MobillsImportInput,
  MobillsImportResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';

export interface CorePlugin {
  ledgerOpenAccount(options: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult>;
  ledgerRenameAccount(options: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(options: LedgerArchiveAccountInput): Promise<void>;
  ledgerDeleteAccount(options: LedgerDeleteAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(options: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(options: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerRecordTransfer(options: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult>;
  ledgerRecordTransferFx(options: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult>;
  ledgerCreateExpenseDraft(options: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(options: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(options: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(options: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(options: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  taxonomyListCategories(options?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyCreateCategory(options: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
  taxonomyListTags(options?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  mobillsImport(options: MobillsImportInput): Promise<MobillsImportResult>;
  orchestrationCategorizeTransaction(
    options: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  orchestrationApplyTransactionTags(
    options: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
  orchestrationListTransactionTaxonomy(
    options: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
  recurrenceCreateRecurringMovement(
    options: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceDeactivateRecurringMovement(options: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    options: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
  schedulingCreateMovement(
    options: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult>;
  schedulingDeactivateMovement(options: SchedulingDeactivateMovementInput): Promise<void>;
  schedulingListMovements(
    options: SchedulingListMovementsInput,
  ): Promise<SchedulingListMovementsResult>;
  expectedCreateMovement(options: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult>;
  expectedListMovements(options: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
  expectedResolveMovement(options: ExpectedResolveMovementInput): Promise<void>;
  expectedDismissMovement(options: ExpectedDismissMovementInput): Promise<void>;
  movementsGetMonthOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsSearch(options: MovementsSearchInput): Promise<MovementsSearchResult>;
  movementsGetOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsListScheduled(options: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
