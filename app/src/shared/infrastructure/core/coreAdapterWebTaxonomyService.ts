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

export type WebTaxonomyServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export class WebTaxonomyService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  constructor(options: WebTaxonomyServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  private transactionOrThrow(transactionId: string) {
    const transaction = this.state.ledgerTransactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  normalizeCategoryName(name: string): string {
    return name.trim().toLowerCase();
  }

  normalizeTagName(name: string): string {
    return name.trim().toLowerCase();
  }

  categoryNameById(categoryId?: string): string | undefined {
    if (!categoryId) {
      return undefined;
    }
    return this.state.taxonomyCategories.find((category) => category.id === categoryId)?.name;
  }

  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): WebTaxonomyCategory | undefined {
    const normalizedName = this.normalizeCategoryName(name);
    return this.state.taxonomyCategories.find(
      (item) =>
        item.status === 'active'
        && item.appliesTo === appliesTo
        && item.normalizedName === normalizedName,
    );
  }

  findCategoryById(categoryId: string): WebTaxonomyCategory | undefined {
    return this.state.taxonomyCategories.find((item) => item.id === categoryId);
  }

  async listCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    const includeArchived = input?.includeArchived === true;
    const items = this.state.taxonomyCategories
      .filter((category) => includeArchived || category.status !== 'archived')
      .filter((category) => !input?.appliesTo || category.appliesTo === input.appliesTo)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        id: category.id,
        name: category.name,
        appliesTo: category.appliesTo,
        status: category.status,
      }));

    return { items };
  }

  async createCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Category name is required');
    }
    const normalizedName = this.normalizeCategoryName(name);
    const appliesTo = input.appliesTo;
    const existing = this.state.taxonomyCategories.find(
      (category) => category.normalizedName === normalizedName && category.appliesTo === appliesTo,
    );
    if (existing) {
      throw new Error(`Category already exists for ${appliesTo}: ${name}`);
    }

    const id = this.nextId();
    this.state.taxonomyCategories.push({
      id,
      name,
      normalizedName,
      appliesTo,
      status: 'active',
      createdAt: this.nowIso(),
    });
    return { id };
  }

  async renameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    const category = this.state.taxonomyCategories.find((item) => item.id === input.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${input.categoryId}`);
    }
    const name = input.name.trim();
    if (!name) {
      throw new Error('Category name is required');
    }
    const normalizedName = this.normalizeCategoryName(name);
    const duplicate = this.state.taxonomyCategories.find(
      (item) => item.id !== category.id
        && item.normalizedName === normalizedName
        && item.appliesTo === category.appliesTo,
    );
    if (duplicate) {
      throw new Error(`Category already exists for ${category.appliesTo}: ${name}`);
    }
    category.name = name;
    category.normalizedName = normalizedName;
  }

  async listTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    const includeArchived = input?.includeArchived === true;
    const items = this.state.taxonomyTags
      .filter((tag) => includeArchived || tag.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        status: tag.status,
      }));

    return { items };
  }

  async renameTag(input: TaxonomyRenameTagInput): Promise<void> {
    const tag = this.state.taxonomyTags.find((item) => item.id === input.tagId);
    if (!tag) {
      throw new Error(`Tag not found: ${input.tagId}`);
    }
    const name = input.name.trim();
    if (!name) {
      throw new Error('Tag name is required');
    }
    const normalizedName = this.normalizeTagName(name);
    const duplicate = this.state.taxonomyTags.find(
      (item) => item.id !== tag.id && item.normalizedName === normalizedName,
    );
    if (duplicate) {
      throw new Error(`Tag already exists: ${name}`);
    }
    tag.name = name;
    tag.normalizedName = normalizedName;
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

    const category = this.findCategoryById(input.categoryId);
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

    const uniqueByNormalizedName = new Map<string, string>();
    for (const rawName of input.tagNames) {
      const name = rawName.trim();
      if (!name) {
        continue;
      }
      const normalizedName = this.normalizeTagName(name);
      if (!uniqueByNormalizedName.has(normalizedName)) {
        uniqueByNormalizedName.set(normalizedName, name);
      }
    }

    if (uniqueByNormalizedName.size === 0) {
      this.state.taxonomyTransactionTags.set(input.transactionId, []);
      return { status: 'none' };
    }

    const tagIds: string[] = [];
    for (const [normalizedName, originalName] of uniqueByNormalizedName) {
      const existing = this.state.taxonomyTags.find((tag) => tag.normalizedName === normalizedName);
      if (existing) {
        if (existing.status !== 'active') {
          return {
            status: 'failed',
            errorCode: 'TAG_ARCHIVED',
            errorMessage: `Tag is archived: ${existing.name}`,
          };
        }
        tagIds.push(existing.id);
        continue;
      }

      const id = this.nextId();
      this.state.taxonomyTags.push({
        id,
        name: originalName,
        normalizedName,
        status: 'active',
        createdAt: this.nowIso(),
      });
      tagIds.push(id);
    }

    this.state.taxonomyTransactionTags.set(input.transactionId, tagIds);
    return {
      status: 'assigned',
      tagIds: [...tagIds],
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
