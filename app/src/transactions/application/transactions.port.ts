import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';

export type TransactionsPort = LedgerGatewayPort & TaxonomyGatewayPort & SchedulingGatewayPort & ExpectedGatewayPort;
