import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { TaxonomyGatewayPort } from '../../taxonomy/infrastructure/taxonomyGateway';

export type TransactionsCorePort = LedgerGatewayPort & TaxonomyGatewayPort;
