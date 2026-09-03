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
import type { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class TaxonomyRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult> {
    return isNativeRuntime() ? CorePlugin.taxonomyListCategories(input) : this.web.taxonomyListCategories(input);
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
