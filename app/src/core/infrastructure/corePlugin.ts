import { registerPlugin } from '@capacitor/core';
import type {
  AccountsListBalancesResult,
} from '../../account/application/accountBalances.port';
import type {
  UserPreferencesResult,
  PreferencesSetDefaultAccountInput,
} from '../../account/application/preferences.port';
import type {
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerRestoreAccountInput,
  LedgerDeleteAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
  LedgerGetNetWorthByCurrencyResult,
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
} from '../../ledger/application/ledger.port';
import type {
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyRenameCategoryInput,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameTagInput,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
} from '../../taxonomy/application/taxonomy.port';
import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
} from '../../imports/application/imports.port';
import type {
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
  SchedulingProcessDueMovementsInput,
  SchedulingProcessDueMovementsResult,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
} from '../../scheduling/application/scheduling.port';
import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
} from '../../expected/application/expected.port';
import type {
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../movements/application/movements.port';
import type {
  AnalyticsListIgnoredMovementsResult,
  AnalyticsSetMovementIgnoredInput,
} from '../../analytics/application/analytics.port';
import type {
  SharingApplyShareToPostedTransactionInput,
  SharingApplyShareToPostedTransactionResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingMovementDetailsResult,
} from '../../sharing/application/sharing.port';

export interface CorePlugin {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(options: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
  accountsListBalances(): Promise<AccountsListBalancesResult>;
  ledgerOpenAccount(options: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult>;
  ledgerRenameAccount(options: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(options: LedgerArchiveAccountInput): Promise<void>;
  ledgerRestoreAccount(options: LedgerRestoreAccountInput): Promise<void>;
  ledgerDeleteAccount(options: LedgerDeleteAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerGetNetWorthByCurrency(): Promise<LedgerGetNetWorthByCurrencyResult>;
  ledgerGetCashFlowSeries(options: LedgerGetCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
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
  taxonomyRenameCategory(options: TaxonomyRenameCategoryInput): Promise<void>;
  taxonomyListTags(options?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  taxonomyRenameTag(options: TaxonomyRenameTagInput): Promise<void>;
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
  movementsExportBackup(): Promise<MovementsBackupExportResult>;
  movementsImportBackup(options: MovementsBackupImportInput): Promise<MovementsBackupImportResult>;
  recurrenceCreateRecurringMovement(
    options: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceUpdateRecurringMovement(
    options: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult>;
  recurrenceDeactivateRecurringMovement(options: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    options: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
  schedulingCreateMovement(
    options: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult>;
  schedulingUpdateMovement(
    options: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult>;
  schedulingDeactivateMovement(options: SchedulingDeactivateMovementInput): Promise<void>;
  schedulingListMovements(
    options: SchedulingListMovementsInput,
  ): Promise<SchedulingListMovementsResult>;
  schedulingProcessDueMovements(
    options?: SchedulingProcessDueMovementsInput,
  ): Promise<SchedulingProcessDueMovementsResult>;
  expectedCreateMovement(options: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult>;
  expectedUpdateMovement(options: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult>;
  expectedListMovements(options: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
  expectedResolveMovement(options: ExpectedResolveMovementInput): Promise<void>;
  expectedDismissMovement(options: ExpectedDismissMovementInput): Promise<void>;
  sharingListPeople(): Promise<SharingListPeopleResult>;
  sharingApplyShareToPostedTransaction(
    options: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult>;
  sharingGetMovementDetails(options: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult>;
  sharingListMovementDetails(options: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
  analyticsSetMovementIgnored(options: AnalyticsSetMovementIgnoredInput): Promise<void>;
  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult>;
  movementsGetMonthOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsSearch(options: MovementsSearchInput): Promise<MovementsSearchResult>;
  movementsGetOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult>;
  movementsListScheduled(options: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
