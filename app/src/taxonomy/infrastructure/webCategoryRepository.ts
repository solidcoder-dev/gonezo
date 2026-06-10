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
import {
  findMasterCategoryById,
  listMasterCategories,
} from '../domain/masterCategories';
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

  constructor(options: WebCategoryRepositoryOptions) {
    this.state = options.state;
    void options.dependencies;
  }

  private masterCategoryAsWebCategory(categoryId: string): WebTaxonomyCategory | undefined {
    const category = findMasterCategoryById(categoryId);
    if (!category) {
      return undefined;
    }
    return {
      id: category.id,
      name: category.name,
      normalizedName: normalizeWebTaxonomyCategoryName(category.name),
      appliesTo: category.appliesTo,
      status: category.status,
      createdAt: 'master',
    };
  }

  categoryNameById(categoryId?: string): string | undefined {
    if (!categoryId) {
      return undefined;
    }
    return findMasterCategoryById(categoryId)?.name
      ?? this.state.taxonomyCategories.find((category) => category.id === categoryId)?.name;
  }

  findActiveCategoryByName(
    name: string,
    appliesTo: 'expense' | 'income',
  ): WebTaxonomyCategory | undefined {
    const normalizedName = normalizeWebTaxonomyCategoryName(name);
    const master = listMasterCategories(appliesTo).find(
      (item) => normalizeWebTaxonomyCategoryName(item.name) === normalizedName,
    );
    if (master) {
      return this.masterCategoryAsWebCategory(master.id);
    }
    return this.state.taxonomyCategories.find(
      (item) =>
        item.status === 'active'
        && item.appliesTo === appliesTo
        && item.normalizedName === normalizedName,
    );
  }

  findCategoryById(categoryId: string): WebTaxonomyCategory | undefined {
    return this.masterCategoryAsWebCategory(categoryId)
      ?? this.state.taxonomyCategories.find((item) => item.id === categoryId);
  }

  async listCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    const includeArchived = input?.includeArchived === true;
    const items = listMasterCategories(input?.appliesTo)
      .filter((category) => includeArchived || category.status !== 'archived')
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
    void input;
    throw new Error('Categories are managed as master data');
  }

  async renameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    void input;
    throw new Error('Categories are managed as master data');
  }
}
