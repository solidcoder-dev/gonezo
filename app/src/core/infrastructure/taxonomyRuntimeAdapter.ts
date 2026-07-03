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
} from '../../taxonomy/application/taxonomy.port';
import { listMasterCategories } from '../../taxonomy/domain/masterCategories';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

function normalizeMasterCategoryKey(name: string, appliesTo: string): string {
  return `${appliesTo}:${name.trim().toLowerCase()}`;
}

async function listNativeMasterCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
  const nativeCategories = await CorePlugin.taxonomyListCategories({ includeArchived: true });
  const nativeByNameAndType = new Map(
    nativeCategories.items.map((category) => [
      normalizeMasterCategoryKey(category.name, category.appliesTo),
      category,
    ]),
  );

  const items: TaxonomyListCategoriesResult['items'] = [];
  for (const master of listMasterCategories(input?.appliesTo)) {
    const key = normalizeMasterCategoryKey(master.name, master.appliesTo);
    const existing = nativeByNameAndType.get(key);
    if (existing) {
      if (input?.includeArchived === true || existing.status !== 'archived') {
        items.push(existing);
      }
      continue;
    }

    const created = await CorePlugin.taxonomyCreateCategory({
      name: master.name,
      appliesTo: master.appliesTo,
    });
    items.push({
      id: created.id,
      name: master.name,
      appliesTo: master.appliesTo,
      status: 'active',
    });
  }

  return {
    items: items.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export class TaxonomyRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    return isNativeRuntime() ? listNativeMasterCategories(input) : this.web.taxonomyListCategories(input);
  }

  taxonomyCreateCategory(input: TaxonomyCreateCategoryInput): Promise<TaxonomyCreateCategoryResult> {
    return isNativeRuntime() ? CorePlugin.taxonomyCreateCategory(input) : this.web.taxonomyCreateCategory(input);
  }

  async taxonomyRenameCategory(input: TaxonomyRenameCategoryInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.taxonomyRenameCategory(input);
      return;
    }
    await this.web.taxonomyRenameCategory(input);
  }

  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult> {
    return isNativeRuntime() ? CorePlugin.taxonomyListTags(input ?? {}) : this.web.taxonomyListTags(input);
  }

  async taxonomyRenameTag(input: TaxonomyRenameTagInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.taxonomyRenameTag(input);
      return;
    }
    await this.web.taxonomyRenameTag(input);
  }

  orchestrationCategorizeTransaction(
    input: OrchestrationCategorizeTransactionInput,
  ): Promise<OrchestrationCategorizeTransactionResult> {
    return isNativeRuntime()
      ? CorePlugin.orchestrationCategorizeTransaction(input)
      : this.web.orchestrationCategorizeTransaction(input);
  }

  orchestrationApplyTransactionTags(
    input: OrchestrationApplyTransactionTagsInput,
  ): Promise<OrchestrationApplyTransactionTagsResult> {
    return isNativeRuntime()
      ? CorePlugin.orchestrationApplyTransactionTags(input)
      : this.web.orchestrationApplyTransactionTags(input);
  }

  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult> {
    return isNativeRuntime()
      ? CorePlugin.orchestrationListTransactionTaxonomy(input)
      : this.web.orchestrationListTransactionTaxonomy(input);
  }
}
