import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';

export type TaxonomyGatewayPort = {
  taxonomyListCategories(input?: {
    appliesTo?: 'income' | 'expense';
    includeArchived?: boolean;
  }): Promise<{ items: TaxonomyCategoryItem[] }>;
  taxonomyCreateCategory(input: {
    name: string;
    appliesTo: 'income' | 'expense';
  }): Promise<{ id: string }>;
  taxonomyListTags(input?: {
    includeArchived?: boolean;
  }): Promise<{ items: TaxonomyTagItem[] }>;
  orchestrationCategorizeTransaction(input: {
    transactionId: string;
    transactionType: 'income' | 'expense';
    categoryId?: string;
  }): Promise<{
    status: 'assigned' | 'failed' | 'none';
    categoryId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
  orchestrationApplyTransactionTags(input: {
    transactionId: string;
    tagNames: string[];
  }): Promise<{
    status: 'assigned' | 'failed' | 'none';
    tagIds?: string[];
    errorCode?: string;
    errorMessage?: string;
  }>;
  orchestrationListTransactionTaxonomy(input: {
    transactionIds: string[];
  }): Promise<{
    items: Array<{
      transactionId: string;
      categoryId?: string;
      tagIds?: string[];
      categorizationStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
      taggingStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
    }>;
  }>;
};

export function createTaxonomyGateway(core: TaxonomyGatewayPort): TaxonomyGatewayPort {
  return {
    taxonomyListCategories: core.taxonomyListCategories,
    taxonomyCreateCategory: core.taxonomyCreateCategory,
    taxonomyListTags: core.taxonomyListTags,
    orchestrationCategorizeTransaction: core.orchestrationCategorizeTransaction,
    orchestrationApplyTransactionTags: core.orchestrationApplyTransactionTags,
    orchestrationListTransactionTaxonomy: core.orchestrationListTransactionTaxonomy,
  };
}
