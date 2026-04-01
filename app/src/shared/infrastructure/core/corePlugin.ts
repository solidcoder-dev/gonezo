import { registerPlugin } from '@capacitor/core';
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
} from '../../domain/corePort';

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
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
  transactionVoiceStart(options: TransactionVoiceStartInput): Promise<TransactionVoiceStartResult>;
  transactionVoiceStop(options: TransactionVoiceStopInput): Promise<TransactionVoiceStopResult>;
  transactionVoiceExtractDraft(options: TransactionVoiceExtractDraftInput): Promise<TransactionVoiceExtractDraftResult>;
  transactionVoiceFinalize(options: TransactionVoiceFinalizeInput): Promise<TransactionVoiceFinalizeResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
