import type {
  TaxonomyCreateCategoryInput,
  TaxonomyCreateCategoryResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyRenameCategoryInput,
} from '../application/taxonomy.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import type {
  WebAppState,
  WebTaxonomyCategory,
} from '../../core/infrastructure/webAppState';
import { compareTaxonomyCategoriesByUsage } from '../domain/categoryOrdering';
import { normalizeWebTaxonomyCategoryName } from './webTaxonomyNames';
import { WEB_MASTER_CATEGORY_SEED } from './webMasterCategorySeed';

export type WebCategoryLookupPort = {
  categoryNameById(categoryId?: string): string | undefined;
};

export type WebCategoryAssignmentPort = WebCategoryLookupPort & {
  findCategoryById(categoryId: string): WebTaxonomyCategory | undefined;
};

export type WebCategoryImportPort = WebCategoryAssignmentPort & {
  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): WebTaxonomyCategory | undefined;
  createCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult>;
};

export type WebCategoryRepositoryOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

export class WebCategoryRepository implements WebCategoryImportPort {
  private readonly state: WebAppState;

  constructor(options: WebCategoryRepositoryOptions) {
    this.state = options.state;
    void options.dependencies;
  }

  private persistedCategories(): WebTaxonomyCategory[] {
    const categoriesByScopeAndName = new Map<string, WebTaxonomyCategory>();
    for (const category of WEB_MASTER_CATEGORY_SEED) {
      categoriesByScopeAndName.set(`${category.appliesTo}:${category.normalizedName}`, category);
    }
    for (const category of this.state.taxonomyCategories) {
      categoriesByScopeAndName.set(`${category.appliesTo}:${category.normalizedName}`, category);
    }
    return [...categoriesByScopeAndName.values()];
  }

  categoryNameById(categoryId?: string): string | undefined {
    if (!categoryId) {
      return undefined;
    }
    return this.persistedCategories().find((category) => category.id === categoryId)?.name;
  }

  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): WebTaxonomyCategory | undefined {
    const normalizedName = normalizeWebTaxonomyCategoryName(name);
    return this.persistedCategories().find(
      (item) => item.status === 'active'
        && item.appliesTo === appliesTo
        && item.normalizedName === normalizedName,
    );
  }

  findCategoryById(categoryId: string): WebTaxonomyCategory | undefined {
    return this.persistedCategories().find((item) => item.id === categoryId);
  }

  async listCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    const includeArchived = input?.includeArchived === true;
    const usageCountByCategoryId = new Map<string, number>();
    for (const transaction of this.state.ledgerTransactions) {
      if (!transaction.categoryId || transaction.status === 'voided') {
        continue;
      }
      usageCountByCategoryId.set(
        transaction.categoryId,
        (usageCountByCategoryId.get(transaction.categoryId) ?? 0) + 1,
      );
    }

    const items = this.persistedCategories()
      .filter((category) => !input?.appliesTo || category.appliesTo === input.appliesTo)
      .filter((category) => includeArchived || category.status !== 'archived')
      .map((category) => ({
        id: category.id,
        name: category.name,
        appliesTo: category.appliesTo,
        status: category.status,
        usageCount: usageCountByCategoryId.get(category.id) ?? 0,
      }))
      .sort(compareTaxonomyCategoriesByUsage);

    return { items };
  }

  async createCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    void input;
    throw new Error('Categories are managed as master data');
  }

  async renameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    void input;
    throw new Error('Categories are managed as master data');
  }
}
