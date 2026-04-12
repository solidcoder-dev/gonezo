import { WebPlugin } from '@capacitor/core';
import type {
  CoreResult,
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
  TransactionVoiceExtractDraftInput,
  TransactionVoiceExtractDraftResult,
  TransactionVoiceFinalizeInput,
  TransactionVoiceFinalizeResult,
  TransactionVoiceStartInput,
  TransactionVoiceStartResult,
  TransactionVoiceStopInput,
  TransactionVoiceStopResult,
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
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { CoreAdapterWeb } from './coreAdapterWeb';
import type { CorePlugin } from './corePlugin';

export class CorePluginWeb extends WebPlugin implements CorePlugin {
  private readonly core = new CoreAdapterWeb();

  async doThing(options: { input: string }): Promise<CoreResult> {
    return this.core.doThing(options.input);
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

  async ledgerDeleteAccount(options: LedgerDeleteAccountInput): Promise<void> {
    return this.core.ledgerDeleteAccount(options);
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return this.core.ledgerListAccounts();
  }

  async ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    return this.core.ledgerGetAccountSummary(options);
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

  async taxonomyListTags(options?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    return this.core.taxonomyListTags(options);
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

  async transactionVoiceStart(options: TransactionVoiceStartInput): Promise<TransactionVoiceStartResult> {
    return this.core.transactionVoiceStart(options);
  }

  async transactionVoiceStop(options: TransactionVoiceStopInput): Promise<TransactionVoiceStopResult> {
    return this.core.transactionVoiceStop(options);
  }

  async transactionVoiceExtractDraft(
    options: TransactionVoiceExtractDraftInput,
  ): Promise<TransactionVoiceExtractDraftResult> {
    return this.core.transactionVoiceExtractDraft(options);
  }

  async transactionVoiceFinalize(options: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult> {
    return this.core.transactionVoiceFinalize(options);
  }

  async recurrenceCreateRecurringMovement(
    options: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    return this.core.recurrenceCreateRecurringMovement(options);
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

  async schedulingDeactivateMovement(options: SchedulingDeactivateMovementInput): Promise<void> {
    return this.core.schedulingDeactivateMovement(options);
  }

  async schedulingListMovements(options: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    return this.core.schedulingListMovements(options);
  }

  async movementsGetOverview(options: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult> {
    return this.core.movementsGetOverview(options);
  }

  async movementsListScheduled(options: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    return this.core.movementsListScheduled(options);
  }
}
