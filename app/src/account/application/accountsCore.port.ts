import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
} from '../../shared/domain/corePort';
import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { TransactionsCorePort } from '../../transactions/application/transactionsCore.port';

export type AccountsCorePort = LedgerGatewayPort;

export type TransactionsImportPort = {
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
};

export type MovementsBackupPort = {
  movementsExportBackup(): Promise<MovementsBackupExportResult>;
};

export type AccountWorkspacePort = AccountsCorePort
  & TransactionsCorePort
  & TransactionsImportPort
  & MovementsBackupPort;
