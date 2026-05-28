import type {
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
} from '../../ledger/application/ledgerCore.port';
import type {
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
} from '../../taxonomy/application/taxonomyCore.port';

export type MobillsImportAccount = {
  id: string;
};

export type MobillsImportCategory = {
  id: string;
};

export type MobillsLedgerPort = {
  resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<MobillsImportAccount>;
  recordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  recordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  recordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult>;
};

export type MobillsTaxonomyPort = {
  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): MobillsImportCategory | undefined;
  findCategoryById(categoryId: string): MobillsImportCategory | undefined;
  createCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
  categorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  applyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
};
