export type TaxonomyCategoryAppliesTo = 'income' | 'expense';

export type TaxonomyCategoryStatus = 'active' | 'archived';

export type TaxonomyCategoryItem = {
  id: string;
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
  status: TaxonomyCategoryStatus;
  usageCount?: number;
};

export type TaxonomyListCategoriesInput = {
  appliesTo?: TaxonomyCategoryAppliesTo;
  includeArchived?: boolean;
};

export type TaxonomyListCategoriesResult = {
  items: TaxonomyCategoryItem[];
};

export type TaxonomyCreateCategoryInput = {
  name: string;
  appliesTo: TaxonomyCategoryAppliesTo;
};

export type TaxonomyCreateCategoryResult = {
  id: string;
};

export type TaxonomyRenameCategoryInput = {
  categoryId: string;
  name: string;
};

export type TaxonomyTagStatus = 'active' | 'archived';

export type TaxonomyTagItem = {
  id: string;
  name: string;
  status: TaxonomyTagStatus;
};

export type TaxonomyListTagsInput = {
  includeArchived?: boolean;
};

export type TaxonomyListTagsResult = {
  items: TaxonomyTagItem[];
};

export type TaxonomyRenameTagInput = {
  tagId: string;
  name: string;
};

export type OrchestrationCategorizeTransactionInput = {
  transactionId: string;
  transactionType: TaxonomyCategoryAppliesTo;
  categoryId?: string;
};

export type OrchestrationCategorizeTransactionResult = {
  status: 'assigned' | 'failed' | 'none';
  categoryId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type OrchestrationApplyTransactionTagsInput = {
  transactionId: string;
  tagNames: string[];
};

export type OrchestrationApplyTransactionTagsResult = {
  status: 'assigned' | 'failed' | 'none';
  tagIds?: string[];
  errorCode?: string;
  errorMessage?: string;
};

export type OrchestrationListTransactionTaxonomyInput = {
  transactionIds: string[];
};

export type OrchestrationTransactionTaxonomyItem = {
  transactionId: string;
  categoryId?: string;
  tagIds?: string[];
  categorizationStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
  taggingStatus?: 'none' | 'pending' | 'processing' | 'assigned' | 'failed';
};

export type OrchestrationListTransactionTaxonomyResult = {
  items: OrchestrationTransactionTaxonomyItem[];
};

export interface TaxonomyPort {
  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
  taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void>;
  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void>;
  orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
}
