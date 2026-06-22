import type { MovementsSearchFacetsPort, MovementsSearchMutationPort } from './movementsSearch.port';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';
import type { MovementsSearchFiltersState } from './movementsView.types';
import type { MovementsSearchAccount } from './movementsSearchResults';
import { runMovementsSearchQuery } from './movementsSearchQueryRunner';

type VoidPostedMovementInput = {
  core: PostedTaxonomySearchPort & MovementsSearchFacetsPort & MovementsSearchMutationPort;
  accountScope: MovementsSearchAccount[];
  accountId: string | null;
  filters: MovementsSearchFiltersState;
  transactionId: string;
};

export async function voidPostedMovementAndReload(input: VoidPostedMovementInput) {
  await input.core.ledgerVoidTransaction({ transactionId: input.transactionId });
  return runMovementsSearchQuery({
    core: input.core,
    accountScope: input.accountScope,
    accountId: input.accountId,
    filters: input.filters,
    page: 0,
  });
}
