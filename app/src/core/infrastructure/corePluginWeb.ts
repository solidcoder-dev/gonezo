import { WebPlugin } from '@capacitor/core';
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
  SchedulingGetMovementInput,
  SchedulingGetMovementResult,
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
  ExpectedPostMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedPendingOverviewResult,
  ExpectedResolveMovementInput,
} from '../../expected/application/expected.port';
import type {
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchInput,
  MovementsSearchResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  MovementsGetDetailInput,
  MovementsGetDetailResult,
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
  SharingGetPlannedShareInput,
  SharingPlannedShareResult,
} from '../../sharing/application/sharing.port';
import { CoreAdapterWeb } from './coreAdapterWeb';
import type { CorePlugin } from './corePlugin';

export class CorePluginWeb extends WebPlugin implements CorePlugin {
  private readonly core = new CoreAdapterWeb();

  async preferencesGet(): Promise<UserPreferencesResult> {
    return this.core.preferencesGet();
  }

  async preferencesSetDefaultAccount(options: PreferencesSetDefaultAccountInput): Promise<void> {
    return this.core.preferencesSetDefaultAccount(options);
  }

  async preferencesClearDefaultAccount(): Promise<void> {
    return this.core.preferencesClearDefaultAccount();
  }

  async accountsListBalances(): Promise<AccountsListBalancesResult> {
    return this.core.accountsListBalances();
  }

  async ledgerOpenAccount(options: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    return this.core.ledgerOpenAccount(options);
  }

  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return this.core.ledgerListSupportedCurrencies();
  }

  async ledgerRenameAccount(options: LedgerRenameAccountInput): Promise<void> {
    return this.core.ledgerRenameAccount(options);
  }

  async ledgerArchiveAccount(options: LedgerArchiveAccountInput): Promise<void> {
    return this.core.ledgerArchiveAccount(options);
  }

  async ledgerRestoreAccount(options: LedgerRestoreAccountInput): Promise<void> {
    return this.core.ledgerRestoreAccount(options);
  }

  async ledgerDeleteAccount(options: LedgerDeleteAccountInput): Promise<void> {
    return this.core.ledgerDeleteAccount(options);
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return this.core.ledgerListAccounts();
  }

  async ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    return this.core.ledgerGetAccountSummary(options);
  }

  async ledgerGetNetWorthByCurrency(): Promise<LedgerGetNetWorthByCurrencyResult> {
    return this.core.ledgerGetNetWorthByCurrency();
  }

  async ledgerGetCashFlowSeries(options: LedgerGetCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> {
    return this.core.ledgerGetCashFlowSeries(options);
  }

  async ledgerRecordExpense(options: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    return this.core.ledgerRecordExpense(options);
  }

  async ledgerRecordIncome(options: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    return this.core.ledgerRecordIncome(options);
  }

  async ledgerRecordTransfer(options: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    return this.core.ledgerRecordTransfer(options);
  }

  async ledgerRecordTransferFx(options: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    return this.core.ledgerRecordTransferFx(options);
  }

  async ledgerCreateExpenseDraft(options: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    return this.core.ledgerCreateExpenseDraft(options);
  }

  async ledgerAddTransactionItem(options: LedgerAddTransactionItemInput): Promise<void> {
    return this.core.ledgerAddTransactionItem(options);
  }

  async ledgerPostDraftTransaction(options: LedgerPostDraftTransactionInput): Promise<void> {
    return this.core.ledgerPostDraftTransaction(options);
  }

  async ledgerVoidTransaction(options: LedgerVoidTransactionInput): Promise<void> {
    return this.core.ledgerVoidTransaction(options);
  }

  async ledgerListTransactions(options: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return this.core.ledgerListTransactions(options);
  }

  async taxonomyListCategories(options?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    return this.core.taxonomyListCategories(options);
  }

  async taxonomyCreateCategory(options: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    return this.core.taxonomyCreateCategory(options);
  }

  async taxonomyRenameCategory(options: TaxonomyRenameCategoryInput): Promise<void> {
    return this.core.taxonomyRenameCategory(options);
  }

  async taxonomyListTags(options?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    return this.core.taxonomyListTags(options);
  }

  async taxonomyRenameTag(options: TaxonomyRenameTagInput): Promise<void> {
    return this.core.taxonomyRenameTag(options);
  }

  async mobillsImport(options: MobillsImportInput): Promise<MobillsImportResult> {
    return this.core.mobillsImport(options);
  }

  async orchestrationCategorizeTransaction(
    options: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    return this.core.orchestrationCategorizeTransaction(options);
  }

  async orchestrationApplyTransactionTags(
    options: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    return this.core.orchestrationApplyTransactionTags(options);
  }

  async orchestrationListTransactionTaxonomy(
    options: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    return this.core.orchestrationListTransactionTaxonomy(options);
  }

  async movementsExportBackup(): Promise<MovementsBackupExportResult> {
    return this.core.movementsExportBackup();
  }

  async movementsImportBackup(options: MovementsBackupImportInput): Promise<MovementsBackupImportResult> {
    return this.core.movementsImportBackup(options);
  }

  async recurrenceCreateRecurringMovement(
    options: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    return this.core.recurrenceCreateRecurringMovement(options);
  }

  async recurrenceUpdateRecurringMovement(
    options: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult> {
    return this.core.schedulingUpdateMovement(options);
  }

  async recurrenceDeactivateRecurringMovement(options: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    return this.core.recurrenceDeactivateRecurringMovement(options);
  }

  async recurrenceListRecurringMovements(
    options: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    return this.core.recurrenceListRecurringMovements(options);
  }

  async schedulingCreateMovement(options: SchedulingCreateMovementInput): Promise<SchedulingCreateMovementResult> {
    return this.core.schedulingCreateMovement(options);
  }

  async schedulingUpdateMovement(options: SchedulingUpdateMovementInput): Promise<SchedulingUpdateMovementResult> {
    return this.core.schedulingUpdateMovement(options);
  }

  async schedulingDeactivateMovement(options: SchedulingDeactivateMovementInput): Promise<void> {
    return this.core.schedulingDeactivateMovement(options);
  }

  async schedulingListMovements(options: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    return this.core.schedulingListMovements(options);
  }

  async schedulingGetMovement(options: SchedulingGetMovementInput): Promise<SchedulingGetMovementResult> {
    return this.core.schedulingGetMovement(options);
  }

  async schedulingProcessDueMovements(
    options: SchedulingProcessDueMovementsInput = {},
  ): Promise<SchedulingProcessDueMovementsResult> {
    return this.core.schedulingProcessDueMovements?.(options) ?? {
      scanned: 0,
      posted: 0,
      expectedCreated: 0,
      failed: 0,
      advancedSchedules: 0,
    };
  }

  async expectedCreateMovement(options: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    return this.core.expectedCreateMovement(options);
  }

  async expectedUpdateMovement(options: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> {
    return this.core.expectedUpdateMovement(options);
  }

  async expectedListMovements(options: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    return this.core.expectedListMovements(options);
  }

  async expectedGetPendingOverview(): Promise<ExpectedPendingOverviewResult> {
    return this.core.expectedGetPendingOverview();
  }

  async expectedResolveMovement(options: ExpectedResolveMovementInput): Promise<void> {
    return this.core.expectedResolveMovement(options);
  }

  async expectedDismissMovement(options: ExpectedDismissMovementInput): Promise<void> {
    return this.core.expectedDismissMovement(options);
  }

  async expectedPostMovement(options: ExpectedPostMovementInput): Promise<{ transactionId: string; shareId?: string; nextExpectedMovementId?: string }> {
    return this.core.expectedPostMovement(options);
  }

  async sharingListPeople(): Promise<SharingListPeopleResult> {
    return this.core.sharingListPeople();
  }

  async sharingApplyShareToPostedTransaction(
    options: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult> {
    return this.core.sharingApplyShareToPostedTransaction(options);
  }

  async sharingGetMovementDetails(options: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult> {
    return this.core.sharingGetMovementDetails(options);
  }

  async sharingListMovementDetails(options: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> {
    return this.core.sharingListMovementDetails(options);
  }

  async sharingGetPlannedShare(options: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult> {
    return this.core.sharingGetPlannedShare(options);
  }

  async analyticsSetMovementIgnored(options: AnalyticsSetMovementIgnoredInput): Promise<void> {
    return this.core.analyticsSetMovementIgnored(options);
  }

  async analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult> {
    return this.core.analyticsListIgnoredMovements();
  }

  async movementsGetMonthOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    return this.core.movementsGetMonthOverview(options);
  }

  async movementsSearch(options: MovementsSearchInput): Promise<MovementsSearchResult> {
    return this.core.movementsSearch(options);
  }

  async movementsGetOverview(options: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> {
    return this.core.movementsGetOverview(options);
  }

  async movementsListScheduled(options: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    return this.core.movementsListScheduled(options);
  }

  async movementsGetDetail(options: MovementsGetDetailInput): Promise<MovementsGetDetailResult> {
    return this.core.movementsGetDetail(options);
  }
}
