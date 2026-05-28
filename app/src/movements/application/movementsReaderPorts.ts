import type {
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
} from '../../expected/application/expectedCore.port';
import type {
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../ledger/application/ledgerCore.port';
import type {
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
} from '../../scheduling/application/schedulingCore.port';
import type {
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomyCore.port';

export type MovementsLedgerReader = {
  listTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
};

export type MovementsTaxonomyReader = {
  categoryNameById(categoryId?: string): string | undefined;
  listTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
  listCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  listTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
};

export type MovementsSchedulingReader = {
  listMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult>;
};

export type MovementsExpectedReader = {
  listMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
};
