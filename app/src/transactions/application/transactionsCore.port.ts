import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { TaxonomyGatewayPort } from '../../taxonomy/infrastructure/taxonomyGateway';
import type { TransactionsVoiceGatewayPort } from '../infrastructure/transactionsVoiceGateway';

export type TransactionsCorePort = LedgerGatewayPort & TaxonomyGatewayPort & TransactionsVoiceGatewayPort;
