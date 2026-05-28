import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
} from '../../imports/application/importsCore.port';
import type { PreferencesSetDefaultAccountInput, UserPreferencesResult } from './preferencesCore.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { TransactionsCorePort } from '../../transactions/application/transactionsCore.port';

export type UserPreferencesPort = {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
};

export type AccountsCorePort = LedgerGatewayPort & UserPreferencesPort;

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
  & MovementsBackupPort
  & UserPreferencesPort;
