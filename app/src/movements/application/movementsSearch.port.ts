import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';

export type MovementsSearchPagePort = Pick<LedgerGatewayPort, 'ledgerListAccounts'> & PostedTaxonomySearchPort;
