import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';
import type { MovementsSearchFacetsInput, MovementsSearchFacetsResult } from './movementsCore.port';

export type MovementsSearchFacetsPort = {
  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult>;
};

export type MovementsSearchPagePort = Pick<LedgerGatewayPort, 'ledgerListAccounts'>
  & PostedTaxonomySearchPort
  & MovementsSearchFacetsPort;
