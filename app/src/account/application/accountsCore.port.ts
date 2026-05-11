import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
} from '../../shared/domain/corePort';
import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { TransactionsCorePort } from '../../transactions/application/transactionsCore.port';

export type AccountsCorePort = LedgerGatewayPort;

export type TransactionsImportPort = {
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
};

export type MovementsBackupPort = {
  movementsExportBackup(): Promise<MovementsBackupExportResult>;
  movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult>;
};

export type AccountWorkspacePort = AccountsCorePort
  & TransactionsCorePort
  & TransactionsImportPort
  & MovementsBackupPort;
