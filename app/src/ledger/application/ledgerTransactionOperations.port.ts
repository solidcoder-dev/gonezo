import type { LedgerPort } from './ledger.port';

export type LedgerTransactionOperationsPort = Pick<LedgerPort, 'ledgerListTransactions' | 'ledgerVoidTransaction'>;
