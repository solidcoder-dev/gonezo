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
  taxonomyRenameCategory(input: {
    categoryId: string;
    name: string;
  }): Promise<void>;
  taxonomyListTags(input?: {
    includeArchived?: boolean;
  }): Promise<{ items: TaxonomyTagItem[] }>;
  taxonomyRenameTag(input: {
    tagId: string;
    name: string;
  }): Promise<void>;
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
    taxonomyListCategories: (input) => core.taxonomyListCategories(input),
    taxonomyCreateCategory: (input) => core.taxonomyCreateCategory(input),
    taxonomyRenameCategory: (input) => core.taxonomyRenameCategory(input),
    taxonomyListTags: (input) => core.taxonomyListTags(input),
    taxonomyRenameTag: (input) => core.taxonomyRenameTag(input),
    orchestrationCategorizeTransaction: (input) => core.orchestrationCategorizeTransaction(input),
    orchestrationApplyTransactionTags: (input) => core.orchestrationApplyTransactionTags(input),
    orchestrationListTransactionTaxonomy: (input) => core.orchestrationListTransactionTaxonomy(input),
  };
}
