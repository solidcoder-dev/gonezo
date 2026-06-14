import type { LedgerListAccountsResult } from '../../ledger/application/ledger.port';

export type MovementQuickActionPreferencesPort = {
  preferencesGet(): Promise<{ defaultAccountId?: string | null }>;
};

export type MovementQuickActionAccountsPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
};

export type MovementQuickActionComponentPort = MovementQuickActionAccountsPort & MovementQuickActionPreferencesPort;

export type MovementQuickActionComponentRequired = {
  context: {
    core: MovementQuickActionComponentPort;
  };
  config: {
    enabled: boolean;
    refreshSignal: boolean;
  };
};

export type MovementQuickActionComponentProvided = {
  events?: {
    onCreateMovementRequested?: (account: { id: string; name: string }) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type MovementQuickActionComponentProps = {
  required: MovementQuickActionComponentRequired;
  provided?: MovementQuickActionComponentProvided;
};
