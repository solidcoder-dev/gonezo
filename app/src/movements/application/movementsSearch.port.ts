import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';
import type { MovementsSearchFacetsInput, MovementsSearchFacetsResult } from './movements.port';

export type MovementsSearchFacetsPort = {
  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult>;
};

export type MovementsSearchMutationPort = Pick<LedgerGatewayPort, 'ledgerVoidTransaction'>;

export type MovementsSearchPagePort = Pick<LedgerGatewayPort, 'ledgerListAccounts'>
  & MovementsSearchMutationPort
  & PostedTaxonomySearchPort
  & MovementsSearchFacetsPort;
