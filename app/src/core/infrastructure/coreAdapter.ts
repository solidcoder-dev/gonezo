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

  preferencesGet = this.preferences.preferencesGet.bind(this.preferences);
  preferencesSetDefaultAccount = this.preferences.preferencesSetDefaultAccount.bind(this.preferences);
  preferencesClearDefaultAccount = this.preferences.preferencesClearDefaultAccount.bind(this.preferences);

  accountsListBalances = this.ledger.accountsListBalances.bind(this.ledger);
  ledgerOpenAccount = this.ledger.ledgerOpenAccount.bind(this.ledger);
  ledgerListSupportedCurrencies = this.ledger.ledgerListSupportedCurrencies.bind(this.ledger);
  ledgerRenameAccount = this.ledger.ledgerRenameAccount.bind(this.ledger);
  ledgerArchiveAccount = this.ledger.ledgerArchiveAccount.bind(this.ledger);
  ledgerRestoreAccount = this.ledger.ledgerRestoreAccount.bind(this.ledger);
  ledgerDeleteAccount = this.ledger.ledgerDeleteAccount.bind(this.ledger);
  ledgerListAccounts = this.ledger.ledgerListAccounts.bind(this.ledger);
  ledgerGetAccountSummary = this.ledger.ledgerGetAccountSummary.bind(this.ledger);
  ledgerGetNetWorthByCurrency = this.ledger.ledgerGetNetWorthByCurrency.bind(this.ledger);
  ledgerGetCashFlowSeries = this.ledger.ledgerGetCashFlowSeries.bind(this.ledger);
  ledgerRecordExpense = this.ledger.ledgerRecordExpense.bind(this.ledger);
  ledgerRecordIncome = this.ledger.ledgerRecordIncome.bind(this.ledger);
  ledgerRecordTransfer = this.ledger.ledgerRecordTransfer.bind(this.ledger);
  ledgerRecordTransferFx = this.ledger.ledgerRecordTransferFx.bind(this.ledger);
  ledgerCreateExpenseDraft = this.ledger.ledgerCreateExpenseDraft.bind(this.ledger);
  ledgerAddTransactionItem = this.ledger.ledgerAddTransactionItem.bind(this.ledger);
  ledgerPostDraftTransaction = this.ledger.ledgerPostDraftTransaction.bind(this.ledger);
  ledgerVoidTransaction = this.ledger.ledgerVoidTransaction.bind(this.ledger);
  ledgerListTransactions = this.ledger.ledgerListTransactions.bind(this.ledger);

  analyticsListCurrencies = this.analytics.analyticsListCurrencies.bind(this.analytics);
  analyticsGetFilterFacets = this.analytics.analyticsGetFilterFacets.bind(this.analytics);
  analyticsGetOverviewSnapshot = this.analytics.analyticsGetOverviewSnapshot.bind(this.analytics);
  analyticsGetOverviewInsights = this.analytics.analyticsGetOverviewInsights.bind(this.analytics);
  analyticsGetCashFlowSeries = this.analytics.analyticsGetCashFlowSeries.bind(this.analytics);
  analyticsGetPeriodCashFlowSummary = this.analytics.analyticsGetPeriodCashFlowSummary.bind(this.analytics);
  analyticsGetSpendingDashboard = this.analytics.analyticsGetSpendingDashboard.bind(this.analytics);
  analyticsGetSpendingTimeline = this.analytics.analyticsGetSpendingTimeline.bind(this.analytics);
  analyticsGetSpendingTopExpenses = this.analytics.analyticsGetSpendingTopExpenses.bind(this.analytics);
  analyticsGetSpendingOverview = this.analytics.analyticsGetSpendingOverview.bind(this.analytics);
  analyticsGetFlowProjection = this.analytics.analyticsGetFlowProjection.bind(this.analytics);
  analyticsGetFlowUpcoming = this.analytics.analyticsGetFlowUpcoming.bind(this.analytics);
  analyticsGetFlowInsights = this.analytics.analyticsGetFlowInsights.bind(this.analytics);
  analyticsSetMovementIgnored = this.analytics.analyticsSetMovementIgnored.bind(this.analytics);
  analyticsListIgnoredMovements = this.analytics.analyticsListIgnoredMovements.bind(this.analytics);

  sharingListPeople = this.sharing.sharingListPeople.bind(this.sharing);
  sharingApplyShareToPostedTransaction = this.sharing.sharingApplyShareToPostedTransaction.bind(this.sharing);
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
  orchestrationListTransactionTaxonomy = this.taxonomy.orchestrationListTransactionTaxonomy.bind(this.taxonomy);

  mobillsImport = this.imports.mobillsImport.bind(this.imports);
  movementsExportBackup = this.imports.movementsExportBackup.bind(this.imports);
  movementsImportBackup = this.imports.movementsImportBackup.bind(this.imports);

  recurrenceCreateRecurringMovement = this.scheduling.recurrenceCreateRecurringMovement.bind(this.scheduling);
  recurrenceDeactivateRecurringMovement = this.scheduling.recurrenceDeactivateRecurringMovement.bind(this.scheduling);
  recurrenceListRecurringMovements = this.scheduling.recurrenceListRecurringMovements.bind(this.scheduling);
  schedulingCreateMovement = this.scheduling.schedulingCreateMovement.bind(this.scheduling);
  schedulingUpdateMovement = this.scheduling.schedulingUpdateMovement.bind(this.scheduling);
  schedulingDeactivateMovement = this.scheduling.schedulingDeactivateMovement.bind(this.scheduling);
  schedulingListMovements = this.scheduling.schedulingListMovements.bind(this.scheduling);
  schedulingProcessDueMovements = this.scheduling.schedulingProcessDueMovements.bind(this.scheduling);

  expectedCreateMovement = this.expected.expectedCreateMovement.bind(this.expected);
  expectedUpdateMovement = this.expected.expectedUpdateMovement.bind(this.expected);
  expectedListMovements = this.expected.expectedListMovements.bind(this.expected);
  expectedResolveMovement = this.expected.expectedResolveMovement.bind(this.expected);
  expectedPostMovement = isNativeRuntime() ? this.expected.expectedPostMovement?.bind(this.expected) : undefined;
  expectedDismissMovement = this.expected.expectedDismissMovement.bind(this.expected);

  movementsGetMonthOverview = this.movements.movementsGetMonthOverview.bind(this.movements);
  movementsSearch = this.movements.movementsSearch.bind(this.movements);
  movementsGetSearchFacets = this.movements.movementsGetSearchFacets.bind(this.movements);
  movementsGetOverview = this.movements.movementsGetOverview.bind(this.movements);
  movementsListScheduled = this.movements.movementsListScheduled.bind(this.movements);
}
