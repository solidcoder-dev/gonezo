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
import { normalizeWebTaxonomyCategoryName } from './webTaxonomyNames';

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

  private readonly dependencies: WebRuntimeDependencies;

  constructor(options: WebCategoryRepositoryOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
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
    const normalizedName = normalizeWebTaxonomyCategoryName(name);
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
    const normalizedName = normalizeWebTaxonomyCategoryName(name);
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
    const normalizedName = normalizeWebTaxonomyCategoryName(name);
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
}
