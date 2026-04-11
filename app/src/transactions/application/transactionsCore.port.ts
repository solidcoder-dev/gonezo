import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { RecurrenceGatewayPort } from '../../recurrence/infrastructure/recurrenceGateway';
import type { TaxonomyGatewayPort } from '../../taxonomy/infrastructure/taxonomyGateway';

export type TransactionsCorePort = LedgerGatewayPort & TaxonomyGatewayPort & RecurrenceGatewayPort;
