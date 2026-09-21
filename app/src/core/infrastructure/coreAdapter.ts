import type { CorePort } from '../application/corePort';
import {
  AnalyticsRuntimeAdapter,
  ExpectedRuntimeAdapter,
  ImportsRuntimeAdapter,
  LedgerRuntimeAdapter,
  MovementsRuntimeAdapter,
  PreferencesRuntimeAdapter,
  SchedulingRuntimeAdapter,
  SharingRuntimeAdapter,
  TaxonomyRuntimeAdapter,
} from './coreRuntimeAdapters';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { isNativeRuntime } from './runtimeAdapterSupport';
import type { FinancialDataChangeObserver } from '../../macroAnalytics/application/financialDataChangeObserver.port';

export class CoreAdapter implements CorePort {
  private readonly web: CoreAdapterWeb = new CoreAdapterWeb();
  private readonly preferences: PreferencesRuntimeAdapter = new PreferencesRuntimeAdapter(this.web);
  private readonly ledger: LedgerRuntimeAdapter = new LedgerRuntimeAdapter(this.web);
  private readonly analytics: AnalyticsRuntimeAdapter = new AnalyticsRuntimeAdapter(this.web, this);
  private readonly sharing: SharingRuntimeAdapter = new SharingRuntimeAdapter(this.web);
  private readonly taxonomy: TaxonomyRuntimeAdapter = new TaxonomyRuntimeAdapter(this.web);
  private readonly imports: ImportsRuntimeAdapter = new ImportsRuntimeAdapter(this.web);
  private readonly scheduling: SchedulingRuntimeAdapter = new SchedulingRuntimeAdapter(this.web);
  private readonly expected: ExpectedRuntimeAdapter = new ExpectedRuntimeAdapter(this.web);
  private readonly movements: MovementsRuntimeAdapter = new MovementsRuntimeAdapter(this.web, this);
  private readonly financialChanges: FinancialDataChangeObserver;

  constructor(financialChanges?: FinancialDataChangeObserver) {
    this.financialChanges = financialChanges ?? {
      periodChanged: async () => {},
      periodAndFollowingChanged: async () => {},
      currentPeriodChanged: async () => {},
      allPeriodsChanged: async () => {},
    };
  }

  preferencesGet = this.preferences.preferencesGet.bind(this.preferences);
  preferencesSetDefaultAccount = this.preferences.preferencesSetDefaultAccount.bind(this.preferences);
  preferencesClearDefaultAccount = this.preferences.preferencesClearDefaultAccount.bind(this.preferences);

  accountsListBalances = this.ledger.accountsListBalances.bind(this.ledger);
  ledgerOpenAccount(input: Parameters<LedgerRuntimeAdapter['ledgerOpenAccount']>[0]) {
    return this.afterMutation(
      () => this.ledger.ledgerOpenAccount(input),
      () => this.financialChanges.periodAndFollowingChanged(input.createdAt ?? new Date().toISOString()),
    );
  }
  ledgerListSupportedCurrencies = this.ledger.ledgerListSupportedCurrencies.bind(this.ledger);
  ledgerRenameAccount = this.ledger.ledgerRenameAccount.bind(this.ledger);
  ledgerArchiveAccount = this.ledger.ledgerArchiveAccount.bind(this.ledger);
  ledgerRestoreAccount = this.ledger.ledgerRestoreAccount.bind(this.ledger);
  ledgerDeleteAccount(input: Parameters<LedgerRuntimeAdapter['ledgerDeleteAccount']>[0]) { return this.afterMutation(() => this.ledger.ledgerDeleteAccount(input), () => this.financialChanges.allPeriodsChanged()); }
  ledgerListAccounts = this.ledger.ledgerListAccounts.bind(this.ledger);
  ledgerGetAccountSummary = this.ledger.ledgerGetAccountSummary.bind(this.ledger);
  ledgerGetNetWorthByCurrency = this.ledger.ledgerGetNetWorthByCurrency.bind(this.ledger);
  ledgerGetCashFlowSeries = this.ledger.ledgerGetCashFlowSeries.bind(this.ledger);
  ledgerRecordExpense(input: Parameters<LedgerRuntimeAdapter['ledgerRecordExpense']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerRecordExpense(input), () => this.financialChanges.periodAndFollowingChanged(input.occurredAt));
  }
  ledgerRecordIncome(input: Parameters<LedgerRuntimeAdapter['ledgerRecordIncome']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerRecordIncome(input), () => this.financialChanges.periodAndFollowingChanged(input.occurredAt));
  }
  ledgerRecordTransfer(input: Parameters<LedgerRuntimeAdapter['ledgerRecordTransfer']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerRecordTransfer(input), () => this.financialChanges.periodAndFollowingChanged(input.occurredAt));
  }
  ledgerRecordTransferFx(input: Parameters<LedgerRuntimeAdapter['ledgerRecordTransferFx']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerRecordTransferFx(input), () => this.financialChanges.periodAndFollowingChanged(input.occurredAt));
  }
  ledgerCreateExpenseDraft = this.ledger.ledgerCreateExpenseDraft.bind(this.ledger);
  ledgerAddTransactionItem = this.ledger.ledgerAddTransactionItem.bind(this.ledger);
  ledgerReplacePostedTransactionItems(input: Parameters<LedgerRuntimeAdapter['ledgerReplacePostedTransactionItems']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerReplacePostedTransactionItems(input), () => this.financialChanges.allPeriodsChanged());
  }
  ledgerPostDraftTransaction(input: Parameters<LedgerRuntimeAdapter['ledgerPostDraftTransaction']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerPostDraftTransaction(input), () => this.financialChanges.allPeriodsChanged());
  }
  ledgerVoidTransaction(input: Parameters<LedgerRuntimeAdapter['ledgerVoidTransaction']>[0]) {
    return this.afterMutation(() => this.ledger.ledgerVoidTransaction(input), () => this.financialChanges.allPeriodsChanged());
  }
  ledgerListTransactions = this.ledger.ledgerListTransactions.bind(this.ledger);

  analyticsListCurrencies = this.analytics.analyticsListCurrencies.bind(this.analytics);
  analyticsGetFilterFacets = this.analytics.analyticsGetFilterFacets.bind(this.analytics);
  analyticsGetOverviewSnapshot = this.analytics.analyticsGetOverviewSnapshot.bind(this.analytics);
  analyticsGetOverviewInsights = this.analytics.analyticsGetOverviewInsights.bind(this.analytics);
  analyticsGetCashFlowSeries = this.analytics.analyticsGetCashFlowSeries.bind(this.analytics);
  analyticsGetPeriodCashFlowSummary = this.analytics.analyticsGetPeriodCashFlowSummary.bind(this.analytics);
  analyticsQueryMetrics = this.analytics.analyticsQueryMetrics.bind(this.analytics);
  analyticsGetSpendingDashboard = this.analytics.analyticsGetSpendingDashboard.bind(this.analytics);
  analyticsGetSpendingTimeline = this.analytics.analyticsGetSpendingTimeline.bind(this.analytics);
  analyticsGetSpendingTopExpenses = this.analytics.analyticsGetSpendingTopExpenses.bind(this.analytics);
  analyticsGetSpendingReport = this.analytics.analyticsGetSpendingReport.bind(this.analytics);
  analyticsGetAnalyticsTopExpenses = this.analytics.analyticsGetAnalyticsTopExpenses.bind(this.analytics);
  analyticsGetSpendingOverview = this.analytics.analyticsGetSpendingOverview.bind(this.analytics);
  analyticsGetFlowReport = this.analytics.analyticsGetFlowReport.bind(this.analytics);
  analyticsSetMovementIgnored(input: Parameters<AnalyticsRuntimeAdapter['analyticsSetMovementIgnored']>[0]) {
    return this.afterMutation(() => this.analytics.analyticsSetMovementIgnored(input), () => this.financialChanges.allPeriodsChanged());
  }
  analyticsListIgnoredMovements = this.analytics.analyticsListIgnoredMovements.bind(this.analytics);
  analyticsListMovementFacts = this.analytics.analyticsListMovementFacts.bind(this.analytics);
  analyticsGetAccountBalanceSnapshot = this.analytics.analyticsGetAccountBalanceSnapshot.bind(this.analytics);

  sharingListPeople = this.sharing.sharingListPeople.bind(this.sharing); sharingListGroupSuggestions = this.sharing.sharingListGroupSuggestions.bind(this.sharing); sharingRenamePerson = this.sharing.sharingRenamePerson.bind(this.sharing);
  sharingApplyShareToPostedMovement(input: Parameters<SharingRuntimeAdapter['sharingApplyShareToPostedMovement']>[0]) {
    return this.afterMutation(() => this.sharing.sharingApplyShareToPostedMovement(input), () => this.financialChanges.allPeriodsChanged());
  }
  sharingReplaceMovementShare(input: Parameters<SharingRuntimeAdapter['sharingReplaceMovementShare']>[0]) {
    return this.afterMutation(() => this.sharing.sharingReplaceMovementShare(input), () => this.financialChanges.allPeriodsChanged());
  }
  sharingRemoveMovementShare(input: Parameters<SharingRuntimeAdapter['sharingRemoveMovementShare']>[0]) {
    return this.afterMutation(() => this.sharing.sharingRemoveMovementShare(input), () => this.financialChanges.allPeriodsChanged());
  }
  sharingGetMovementDetails = this.sharing.sharingGetMovementDetails.bind(this.sharing);
  sharingListMovementDetails = this.sharing.sharingListMovementDetails.bind(this.sharing);
  sharingGetPlannedShare = this.sharing.sharingGetPlannedShare.bind(this.sharing);

  taxonomyListCategories = this.taxonomy.taxonomyListCategories.bind(this.taxonomy);
  taxonomyCreateCategory = this.taxonomy.taxonomyCreateCategory.bind(this.taxonomy);
  taxonomyRenameCategory = this.taxonomy.taxonomyRenameCategory.bind(this.taxonomy);
  taxonomyListTags = this.taxonomy.taxonomyListTags.bind(this.taxonomy);
  taxonomyRenameTag = this.taxonomy.taxonomyRenameTag.bind(this.taxonomy);
  orchestrationCategorizeTransaction = this.taxonomy.orchestrationCategorizeTransaction.bind(this.taxonomy);
  orchestrationApplyTransactionTags = this.taxonomy.orchestrationApplyTransactionTags.bind(this.taxonomy);
  orchestrationApplyTransactionItemTags = this.taxonomy.orchestrationApplyTransactionItemTags.bind(this.taxonomy);
  orchestrationListTransactionTaxonomy = this.taxonomy.orchestrationListTransactionTaxonomy.bind(this.taxonomy);

  mobillsImport(input: Parameters<ImportsRuntimeAdapter['mobillsImport']>[0]) { return this.afterMutation(() => this.imports.mobillsImport(input), () => this.financialChanges.allPeriodsChanged()); }
  movementsExportBackup = this.imports.movementsExportBackup.bind(this.imports);
  movementsImportBackup(input: Parameters<ImportsRuntimeAdapter['movementsImportBackup']>[0]) { return this.afterMutation(() => this.imports.movementsImportBackup(input), () => this.financialChanges.allPeriodsChanged()); }
  applicationExportBackup = this.imports.applicationExportBackup.bind(this.imports);
  applicationImportBackup(input: Parameters<ImportsRuntimeAdapter['applicationImportBackup']>[0]) { return this.afterMutation(() => this.imports.applicationImportBackup(input), () => this.financialChanges.allPeriodsChanged()); }

  recurrenceCreateRecurringMovement(input: Parameters<SchedulingRuntimeAdapter['recurrenceCreateRecurringMovement']>[0]) { return this.afterMutation(() => this.scheduling.recurrenceCreateRecurringMovement(input), () => this.financialChanges.currentPeriodChanged()); }
  recurrenceDeactivateRecurringMovement(input: Parameters<SchedulingRuntimeAdapter['recurrenceDeactivateRecurringMovement']>[0]) { return this.afterMutation(() => this.scheduling.recurrenceDeactivateRecurringMovement(input), () => this.financialChanges.currentPeriodChanged()); }
  recurrenceListRecurringMovements = this.scheduling.recurrenceListRecurringMovements.bind(this.scheduling);
  schedulingCreateMovement(input: Parameters<SchedulingRuntimeAdapter['schedulingCreateMovement']>[0]) { return this.afterMutation(() => this.scheduling.schedulingCreateMovement(input), () => this.financialChanges.currentPeriodChanged()); }
  schedulingUpdateMovement(input: Parameters<SchedulingRuntimeAdapter['schedulingUpdateMovement']>[0]) { return this.afterMutation(() => this.scheduling.schedulingUpdateMovement(input), () => this.financialChanges.currentPeriodChanged()); }
  schedulingDeactivateMovement(input: Parameters<SchedulingRuntimeAdapter['schedulingDeactivateMovement']>[0]) { return this.afterMutation(() => this.scheduling.schedulingDeactivateMovement(input), () => this.financialChanges.currentPeriodChanged()); }
  schedulingListMovements = this.scheduling.schedulingListMovements.bind(this.scheduling);
  schedulingGetMovement = this.scheduling.schedulingGetMovement.bind(this.scheduling);
  movementsGetDetail = this.movements.movementsGetDetail.bind(this.movements);
  movementReuseSearchGroups = this.movements.movementReuseSearchGroups.bind(this.movements);
  movementReuseListVariants = this.movements.movementReuseListVariants.bind(this.movements);
  movementReuseGetTemplate = this.movements.movementReuseGetTemplate.bind(this.movements);
  schedulingProcessDueMovements(input?: Parameters<SchedulingRuntimeAdapter['schedulingProcessDueMovements']>[0]) { return this.afterMutation(() => this.scheduling.schedulingProcessDueMovements(input), () => this.financialChanges.currentPeriodChanged()); }

  expectedCreateMovement(input: Parameters<ExpectedRuntimeAdapter['expectedCreateMovement']>[0]) { return this.afterMutation(() => this.expected.expectedCreateMovement(input), () => this.financialChanges.periodChanged(input.expectedAt)); }
  expectedUpdateMovement(input: Parameters<ExpectedRuntimeAdapter['expectedUpdateMovement']>[0]) { return this.afterMutation(() => this.expected.expectedUpdateMovement(input), () => this.financialChanges.allPeriodsChanged()); }
  expectedListMovements = this.expected.expectedListMovements.bind(this.expected);
  expectedGetPendingOverview = this.expected.expectedGetPendingOverview.bind(this.expected);
  expectedResolveMovement(input: Parameters<ExpectedRuntimeAdapter['expectedResolveMovement']>[0]) { return this.afterMutation(() => this.expected.expectedResolveMovement(input), () => this.financialChanges.allPeriodsChanged()); }
  expectedPostMovement = isNativeRuntime() ? (input: Parameters<NonNullable<ExpectedRuntimeAdapter['expectedPostMovement']>>[0]) =>
    this.afterMutation(() => this.expected.expectedPostMovement!(input), () => this.financialChanges.allPeriodsChanged()) : undefined;
  expectedDismissMovement(input: Parameters<ExpectedRuntimeAdapter['expectedDismissMovement']>[0]) { return this.afterMutation(() => this.expected.expectedDismissMovement(input), () => this.financialChanges.allPeriodsChanged()); }

  movementsGetMonthOverview = this.movements.movementsGetMonthOverview.bind(this.movements);
  movementsSearch = this.movements.movementsSearch.bind(this.movements);
  movementsGetSearchFacets = this.movements.movementsGetSearchFacets.bind(this.movements);
  movementsGetOverview = this.movements.movementsGetOverview.bind(this.movements);
  movementsListScheduled = this.movements.movementsListScheduled.bind(this.movements);

  private async afterMutation<T>(operation: () => Promise<T>, invalidate: () => Promise<void>): Promise<T> {
    const result = await operation();
    await invalidate().catch(() => undefined);
    return result;
  }
}
