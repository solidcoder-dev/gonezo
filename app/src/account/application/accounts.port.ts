import type { MobillsImportInput, MobillsImportResult } from '../../imports/application/imports.port';
import type { PreferencesSetDefaultAccountInput, UserPreferencesResult } from './preferences.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import type { AccountBalancesPort } from './accountBalances.port';

export type UserPreferencesPort = {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
};

export type AccountsPort = LedgerGatewayPort & UserPreferencesPort;

export type TransactionsImportPort = {
  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult>;
};

export type AccountWorkspacePort = AccountsPort
  & AccountBalancesPort
  & TransactionsPort
  & TransactionsImportPort;
