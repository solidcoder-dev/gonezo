import type { TaxonomyGatewayPort } from '../application/taxonomyGateway.port';

export type { TaxonomyGatewayPort } from '../application/taxonomyGateway.port';

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
