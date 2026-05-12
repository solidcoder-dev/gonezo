import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';
import type { MovementsSearchFacetsInput, MovementsSearchFacetsResult } from '../../shared/domain/corePort';

export type MovementsSearchFacetsPort = {
  movementsGetSearchFacets(input: MovementsSearchFacetsInput): Promise<MovementsSearchFacetsResult>;
};

export type MovementsSearchPagePort = Pick<LedgerGatewayPort, 'ledgerListAccounts'>
  & PostedTaxonomySearchPort
  & MovementsSearchFacetsPort;
