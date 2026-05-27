import type {
  OrchestrationApplyTransactionTagsInput,
  OrchestrationApplyTransactionTagsResult,
  OrchestrationCategorizeTransactionInput,
  OrchestrationCategorizeTransactionResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
  TaxonomyRenameCategoryInput,
  TaxonomyRenameTagInput,
} from '../../domain/corePort';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import type {
  WebCoreState,
  WebTaxonomyCategory,
} from './coreAdapterWebState';
import {
  WebCategoryRepository,
  type WebCategoryImportPort,
  type WebCategoryLookupPort,
} from './coreAdapterWebCategoryRepository';
import {
  WebTagRepository,
} from './coreAdapterWebTagRepository';
import {
  WebTransactionTaxonomyService,
  type WebTransactionTaxonomyPort,
} from './coreAdapterWebTransactionTaxonomyService';

export type WebTaxonomyServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export type WebMovementsTaxonomyPort = WebCategoryLookupPort & Pick<
  WebTransactionTaxonomyPort,
  'listTransactionTaxonomy'
>;

export type WebMobillsTaxonomyPort = WebCategoryImportPort & Pick<
  WebTransactionTaxonomyPort,
  'categorizeTransaction' | 'applyTransactionTags'
>;

export type WebSearchFacetsTaxonomyPort =
  & Pick<WebCategoryRepository, 'listCategories'>
  & Pick<WebTagRepository, 'listTags'>
  & Pick<WebTransactionTaxonomyPort, 'listTransactionTaxonomy'>;

export class WebTaxonomyService implements WebMobillsTaxonomyPort, WebMovementsTaxonomyPort, WebSearchFacetsTaxonomyPort {
  private readonly categories: WebCategoryRepository;

  private readonly tags: WebTagRepository;

  private readonly transactionTaxonomy: WebTransactionTaxonomyService;

  constructor(options: WebTaxonomyServiceOptions) {
    this.categories = new WebCategoryRepository({
      state: options.state,
      dependencies: options.dependencies,
    });
    this.tags = new WebTagRepository({
      state: options.state,
      dependencies: options.dependencies,
    });
    this.transactionTaxonomy = new WebTransactionTaxonomyService({
      state: options.state,
      categories: this.categories,
      tags: this.tags,
    });
  }

  categoryNameById(categoryId?: string): string | undefined {
    return this.categories.categoryNameById(categoryId);
  }

  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): WebTaxonomyCategory | undefined {
    return this.categories.findActiveCategoryByName(name, appliesTo);
  }

  findCategoryById(categoryId: string): WebTaxonomyCategory | undefined {
    return this.categories.findCategoryById(categoryId);
  }

  async listCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    return this.categories.listCategories(input);
  }

  async createCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    return this.categories.createCategory(input);
  }

  async renameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    return this.categories.renameCategory(input);
  }

  async listTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    return this.tags.listTags(input);
  }

  async renameTag(input: TaxonomyRenameTagInput): Promise<void> {
    return this.tags.renameTag(input);
  }

  async categorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    return this.transactionTaxonomy.categorizeTransaction(input);
  }

  async applyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    return this.transactionTaxonomy.applyTransactionTags(input);
  }

  async listTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    return this.transactionTaxonomy.listTransactionTaxonomy(input);
  }
}
