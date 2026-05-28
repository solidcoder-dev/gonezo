import type {
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
} from '../../taxonomy/application/taxonomyCore.port';
import type {
  WebCoreState,
  WebLedgerTransaction,
} from './coreAdapterWebState';
import type { WebCategoryAssignmentPort } from './coreAdapterWebCategoryRepository';
import type { WebTagAssignmentPort } from './coreAdapterWebTagRepository';
import { uniqueWebTaxonomyTagNames } from './coreAdapterWebTaxonomyNames';

export type WebTransactionTaxonomyPort = {
  categorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult>;
  applyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult>;
  listTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
};

export type WebTransactionTaxonomyServiceOptions = {
  state: WebCoreState;
  categories: WebCategoryAssignmentPort;
  tags: WebTagAssignmentPort;
};

export class WebTransactionTaxonomyService implements WebTransactionTaxonomyPort {
  private readonly state: WebCoreState;

  private readonly categories: WebCategoryAssignmentPort;

  private readonly tags: WebTagAssignmentPort;

  constructor(options: WebTransactionTaxonomyServiceOptions) {
    this.state = options.state;
    this.categories = options.categories;
    this.tags = options.tags;
  }

  private transactionOrThrow(transactionId: string): WebLedgerTransaction {
    const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  async categorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    const transaction = this.transactionOrThrow(input.transactionId);
    const normalizedType = input.transactionType.trim().toLowerCase();
    if (transaction.type !== normalizedType) {
      throw new Error(`Transaction ${transaction.id} type mismatch: expected ${transaction.type}, got ${normalizedType}`);
    }
    if (normalizedType !== 'expense' && normalizedType !== 'income') {
      throw new Error('Only income/expense transactions can be categorized');
    }

    if (!input.categoryId) {
      transaction.categoryId = undefined;
      return { status: 'none' };
    }

    const category = this.categories.findCategoryById(input.categoryId);
    if (!category) {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_NOT_FOUND',
        errorMessage: `Category not found: ${input.categoryId}`,
      };
    }
    if (category.status !== 'active') {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_ARCHIVED',
        errorMessage: 'Archived categories cannot be assigned',
      };
    }
    if (category.appliesTo !== normalizedType) {
      return {
        status: 'failed',
        categoryId: input.categoryId,
        errorCode: 'CATEGORY_APPLIES_TO_MISMATCH',
        errorMessage: `Category applies to ${category.appliesTo}, got ${normalizedType}`,
      };
    }

    transaction.categoryId = category.id;
    return { status: 'assigned', categoryId: category.id };
  }

  async applyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    this.transactionOrThrow(input.transactionId);

    const uniqueByNormalizedName = uniqueWebTaxonomyTagNames(input.tagNames);
    if (uniqueByNormalizedName.size === 0) {
      this.state.taxonomyTransactionTags.set(input.transactionId, []);
      return { status: 'none' };
    }

    const assigned = this.tags.assignActiveTagNames(uniqueByNormalizedName);
    if (assigned.status === 'failed') {
      return assigned;
    }

    this.state.taxonomyTransactionTags.set(input.transactionId, assigned.tagIds);
    return {
      status: 'assigned',
      tagIds: [...assigned.tagIds],
    };
  }

  async listTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    const uniqueTransactionIds = [...new Set(input.transactionIds.map((id) => id.trim()).filter((id) => id.length > 0))];
    const items: OrchestrationListTransactionTaxonomyResult['items'] = uniqueTransactionIds.map((transactionId) => {
      const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
      const tagIds = this.state.taxonomyTransactionTags.get(transactionId) ?? [];
      const categoryId = transaction?.categoryId;
      return {
        transactionId,
        categoryId,
        tagIds: [...tagIds],
        categorizationStatus: categoryId ? 'assigned' : 'none',
        taggingStatus: tagIds.length > 0 ? 'assigned' : 'none',
      };
    });
    return { items };
  }
}
