import type { CorePort } from '../application/corePort';
import type { AccountsListBalancesResult } from '../../account/application/accountBalances.port';
import type { AnalyticsCashFlowSeriesInput, AnalyticsCashFlowSummaryResult, AnalyticsCurrencyScopeInput, AnalyticsFlowInsightsInput, AnalyticsFlowInsightsResult, AnalyticsFlowProjectionInput, AnalyticsFlowProjectionResult, AnalyticsFlowUpcomingInput, AnalyticsFlowUpcomingResult, AnalyticsGetFilterFacetsInput, AnalyticsGetFilterFacetsResult, AnalyticsListCurrenciesResult, AnalyticsSetMovementIgnoredInput, AnalyticsSpendingDashboardInput, AnalyticsSpendingDashboardResult, AnalyticsSpendingOverviewInput, AnalyticsSpendingOverviewResult, AnalyticsSpendingTimelineInput, AnalyticsSpendingTimelineResult, AnalyticsSpendingTopExpensesInput, AnalyticsSpendingTopExpensesResult } from '../../analytics/application/analytics.port';
import type { AnalyticsOverviewInsightsInput, AnalyticsOverviewInsightsResult, AnalyticsOverviewSnapshotInput, AnalyticsOverviewSnapshotResult } from '../../analytics/application/analytics.port';
import type {
  PreferencesSetDefaultAccountInput,
  UserPreferencesResult,
} from '../../account/application/preferences.port';
import type {
  LedgerAddTransactionItemInput,
  LedgerArchiveAccountInput,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerDeleteAccountInput,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
  LedgerGetNetWorthByCurrencyResult,
  LedgerListAccountsResult,
  LedgerListSupportedCurrenciesResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerPostDraftTransactionInput,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRenameAccountInput,
  LedgerRestoreAccountInput,
  LedgerVoidTransactionInput,
} from '../../ledger/application/ledger.port';
import type {
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameCategoryInput,
  TaxonomyRenameTagInput,
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
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
} from '../../expected/application/expected.port';
import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
  MovementsSearchInput,
  MovementsSearchResult,
} from '../../movements/application/movements.port';
import type {
  SharingApplyShareToPostedTransactionInput,
  SharingApplyShareToPostedTransactionResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingMovementDetailsResult,
} from '../../sharing/application/sharing.port';
import {
  collectWebMovementsBackupExport,
  summarizeWebMovementsBackupExport,
  webMovementsBackupFileName,
} from '../../imports/infrastructure/webBackup';
import {
  defaultWebRuntimeDependencies,
  type WebRuntimeDependencies,
} from './webRuntimeDependencies';
import { WebExpectedMovementsService } from '../../expected/infrastructure/webExpectedService';
import { WebLedgerService } from '../../ledger/infrastructure/webLedgerService';
import { WebSharingService } from '../../sharing/infrastructure/webSharingService';
import { WebMobillsImportWorkflow } from '../../imports/infrastructure/providers/mobills/webMobillsImportWorkflow';
import { WebMovementsService } from '../../movements/infrastructure/webMovementsService';
import { WebSchedulingService } from '../../scheduling/infrastructure/webSchedulingService';
import {
  defaultWebAppState,
  type WebAppState,
} from './webAppState';
import { WebTaxonomyService } from '../../taxonomy/infrastructure/webTaxonomyService';
import { sortNetWorthCurrencies } from '../../ledger/application/netWorthOrdering';
import { listAccountBalances } from './accountBalancesQuery';
import { analyticsGetCashFlowSeries, analyticsGetFilterFacets, analyticsGetFlowInsights, analyticsGetFlowProjection, analyticsGetFlowUpcoming, analyticsGetOverviewInsights, analyticsGetOverviewSnapshot, analyticsGetPeriodCashFlowSummary, analyticsGetSpendingDashboard, analyticsGetSpendingOverview, analyticsGetSpendingTimeline, analyticsGetSpendingTopExpenses, analyticsListCurrencies } from '../../analytics/infrastructure/analyticsQueries';
import { WebAnalyticsExclusionService } from '../../analytics/infrastructure/webAnalyticsExclusionService';

export type CoreAdapterWebOptions = {
  state?: WebAppState;
  dependencies?: Partial<WebRuntimeDependencies>;
};

export class CoreAdapterWeb implements CorePort {
  private readonly state: WebAppState;
  private readonly dependencies: WebRuntimeDependencies;
  private readonly ledgerService: WebLedgerService;
  private readonly taxonomyService: WebTaxonomyService;
  private readonly mobillsImportWorkflow: WebMobillsImportWorkflow;
  private readonly schedulingService: WebSchedulingService;
  private readonly expectedMovementsService: WebExpectedMovementsService;
  private readonly movementsService: WebMovementsService;
  private readonly sharingService: WebSharingService;
  private readonly analyticsExclusionService: WebAnalyticsExclusionService;

  constructor(options: CoreAdapterWebOptions = {}) {
    this.state = options.state ?? defaultWebAppState;
    this.dependencies = {
      clock: options.dependencies?.clock ?? defaultWebRuntimeDependencies.clock,
      idGenerator: options.dependencies?.idGenerator ?? defaultWebRuntimeDependencies.idGenerator,
      backupDownloader: options.dependencies?.backupDownloader ?? defaultWebRuntimeDependencies.backupDownloader,
    };
    this.ledgerService = new WebLedgerService({
      state: this.state,
      dependencies: this.dependencies,
    });
    this.taxonomyService = new WebTaxonomyService({
      state: this.state,
      dependencies: this.dependencies,
    });
    this.mobillsImportWorkflow = new WebMobillsImportWorkflow({
      state: this.state,
      ledger: this.ledgerService,
      taxonomy: this.taxonomyService,
    });
    this.schedulingService = new WebSchedulingService({
      state: this.state,
      dependencies: this.dependencies,
      ledger: this.ledgerService,
    });
    this.expectedMovementsService = new WebExpectedMovementsService({
      state: this.state,
      dependencies: this.dependencies,
      ledger: this.ledgerService,
    });
    this.sharingService = new WebSharingService({
      state: this.state,
      dependencies: this.dependencies,
      ledger: this.ledgerService,
      expected: this.expectedMovementsService,
    });
    this.analyticsExclusionService = new WebAnalyticsExclusionService(this.state, this.dependencies);
    this.movementsService = new WebMovementsService({
      state: this.state,
      ledger: this.ledgerService,
      taxonomy: this.taxonomyService,
      scheduling: this.schedulingService,
      expected: this.expectedMovementsService,
    });
  }

  async preferencesGet(): Promise<UserPreferencesResult> { return { defaultAccountId: this.state.defaultAccountId }; }

  async preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.state.defaultAccountId = accountId;
  }
  async preferencesClearDefaultAccount(): Promise<void> { this.state.defaultAccountId = null; }
  async accountsListBalances(): Promise<AccountsListBalancesResult> { return listAccountBalances(this); }
  async ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> { return this.ledgerService.openAccount(input); }
  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> { return this.ledgerService.listSupportedCurrencies(); }
  async ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void> { return this.ledgerService.renameAccount(input); }
  async ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void> { return this.ledgerService.archiveAccount(input); }
  async ledgerRestoreAccount(input: LedgerRestoreAccountInput): Promise<void> { return this.ledgerService.restoreAccount(input); }
  async ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void> { return this.ledgerService.deleteAccount(input); }
  async ledgerListAccounts(): Promise<LedgerListAccountsResult> { return this.ledgerService.listAccounts(); }
  async ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> { return this.ledgerService.getAccountSummary(input); }

  async ledgerGetNetWorthByCurrency(): Promise<LedgerGetNetWorthByCurrencyResult> {
    const result = await this.ledgerService.getNetWorthByCurrency();
    const defaultAccount = this.state.defaultAccountId
      ? this.state.ledgerAccounts.find((account) => account.id === this.state.defaultAccountId)
      : undefined;
    return {
      items: sortNetWorthCurrencies(result.items, defaultAccount?.currency),
    };
  }

  async ledgerGetCashFlowSeries(input: LedgerGetCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> { return this.ledgerService.getCashFlowSeries(input); }
  async analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult> { return analyticsListCurrencies(this); }
  async analyticsGetFilterFacets(input?: AnalyticsGetFilterFacetsInput): Promise<AnalyticsGetFilterFacetsResult> { return analyticsGetFilterFacets(this, input); }
  async analyticsGetOverviewSnapshot(input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult> { return analyticsGetOverviewSnapshot(this, input); }
  async analyticsGetOverviewInsights(input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult> { return analyticsGetOverviewInsights(this, input); }
  async analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> { return analyticsGetCashFlowSeries(this, input); }
  async analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult> { return analyticsGetPeriodCashFlowSummary(this, input); }
  async analyticsGetSpendingDashboard(input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult> { return analyticsGetSpendingDashboard(this, input); }
  async analyticsGetSpendingTimeline(input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult> { return analyticsGetSpendingTimeline(this, input); }
  async analyticsGetSpendingTopExpenses(input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult> { return analyticsGetSpendingTopExpenses(this, input); }
  async analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult> { return analyticsGetSpendingOverview(this, input); }
  async analyticsGetFlowProjection(input: AnalyticsFlowProjectionInput): Promise<AnalyticsFlowProjectionResult> { return analyticsGetFlowProjection(this, input); }
  async analyticsGetFlowUpcoming(input: AnalyticsFlowUpcomingInput): Promise<AnalyticsFlowUpcomingResult> { return analyticsGetFlowUpcoming(this, input); }
  async analyticsGetFlowInsights(input: AnalyticsFlowInsightsInput): Promise<AnalyticsFlowInsightsResult> { return analyticsGetFlowInsights(this, input); }
  async sharingListPeople(): Promise<SharingListPeopleResult> { return this.sharingService.listPeople(); }

  async sharingApplyShareToPostedTransaction(
    input: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult> {
    return this.sharingService.applyShareToPostedTransaction(input);
  }

  async sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult> { return this.sharingService.getMovementDetails(input); }
  async sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> { return this.sharingService.listMovementDetails(input); }
  async ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> { return this.ledgerService.recordExpense(input); }
  async ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> { return this.ledgerService.recordIncome(input); }
  async ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> { return this.ledgerService.recordTransfer(input); }
  async ledgerRecordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> { return this.ledgerService.recordTransferFx(input); }
  async ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> { return this.ledgerService.createExpenseDraft(input); }
  async ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> { return this.ledgerService.addTransactionItem(input); }
  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> { return this.ledgerService.postDraftTransaction(input); }
  async ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void> { return this.ledgerService.voidTransaction(input); }
  async ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> { return this.analyticsExclusionService.applyIgnoredMovements(await this.ledgerService.listTransactions(input)); }
  async taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> { return this.taxonomyService.listCategories(input); }
  async taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> { return this.taxonomyService.createCategory(input); }
  async taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void> { return this.taxonomyService.renameCategory(input); }
  async taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> { return this.taxonomyService.listTags(input); }
  async taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void> { return this.taxonomyService.renameTag(input); }
  async mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult> { return this.mobillsImportWorkflow.import(input); }

  async orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    return this.taxonomyService.categorizeTransaction(input);
  }

  async orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    return this.taxonomyService.applyTransactionTags(input);
  }

  async orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    return this.taxonomyService.listTransactionTaxonomy(input);
  }

  async recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    return this.schedulingService.createRecurringMovement(input);
  }

  async recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> { return this.schedulingService.deactivateRecurringMovement(input); }
  async recurrenceListRecurringMovements(input: RecurrenceListRecurringMovementsInput): Promise<RecurrenceListRecurringMovementsResult> { return this.schedulingService.listRecurringMovements(input); }

  async schedulingCreateMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult> {
    const result = await this.schedulingService.createMovement(input);
    await this.projectNextConfirmationRequiredOccurrence(result.id);
    return result;
  }

  async schedulingUpdateMovement(
    input: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult> {
    const result = await this.schedulingService.updateMovement(input);
    await this.projectNextConfirmationRequiredOccurrence(result.id);
    return result;
  }

  async schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void> { return this.schedulingService.deactivateMovement(input); }
  async schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> { return this.schedulingService.listMovements(input); }
  async schedulingProcessDueMovements(input: SchedulingProcessDueMovementsInput = {}): Promise<SchedulingProcessDueMovementsResult> {
    void input;
    return {
      scanned: 0,
      posted: 0,
      expectedCreated: 0,
      failed: 0,
      advancedSchedules: 0,
    };
  }

  async movementsGetMonthOverview(input: MovementsMonthOverviewInput): Promise<MovementsMonthOverviewResult> { return this.movementsService.getMonthOverview(input); }
  async movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> { return this.movementsService.getOverview(input); }
  async expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> { return this.expectedMovementsService.createMovement(input); }
  async expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> { return this.expectedMovementsService.updateMovement(input); }
  async expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> { return this.expectedMovementsService.listMovements(input); }

  async expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    await this.expectedMovementsService.resolveMovement(input);
    if (movement?.originRecurringMovementId) {
      await this.projectNextConfirmationRequiredOccurrence(movement.originRecurringMovementId);
    }
  }

  async expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    await this.expectedMovementsService.dismissMovement(input);
    if (movement?.originRecurringMovementId) {
      await this.projectNextConfirmationRequiredOccurrence(movement.originRecurringMovementId);
    }
  }

  async movementsExportBackup(): Promise<MovementsBackupExportResult> {
    const exportData = await collectWebMovementsBackupExport(this, this.dependencies.clock.nowIso());
    const fileName = webMovementsBackupFileName(exportData.exportedAt);
    const json = JSON.stringify(exportData, null, 2);
    this.dependencies.backupDownloader.downloadJson(fileName, json);

    return summarizeWebMovementsBackupExport(exportData, fileName);
  }

  async movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult> {
    if (!input.fileBase64.trim()) {
      throw new Error('fileBase64 is required');
    }
    throw new Error('Backup import is only available on Android.');
  }

  async movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult> { return this.movementsService.search(input); }
  async movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult> { return this.movementsService.getSearchFacets(input); }
  async movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> { return this.movementsService.listScheduled(input); }
  async analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void> { this.analyticsExclusionService.setMovementIgnored(input); }
  async analyticsListIgnoredMovements() { return this.analyticsExclusionService.listIgnoredMovements(); }
  private async projectNextConfirmationRequiredOccurrence(recurringMovementId: string): Promise<void> {
    const occurrence = this.schedulingService.projectNextConfirmationRequiredOccurrence(recurringMovementId);
    if (!occurrence || occurrence.movement.type === 'transfer') {
      return;
    }
    await this.expectedMovementsService.createMovement({
      accountId: occurrence.movement.sourceAccountId,
      type: occurrence.movement.type,
      amount: occurrence.movement.amount,
      currency: occurrence.movement.currency,
      expectedAt: occurrence.dueAt,
      description: occurrence.movement.description,
      merchant: occurrence.movement.merchant,
      categoryId: occurrence.movement.categoryId,
      splitItems: occurrence.movement.splitItems,
      originOccurrenceId: occurrence.id,
      originRecurringMovementId: occurrence.recurringMovementId,
    });
  }
}
