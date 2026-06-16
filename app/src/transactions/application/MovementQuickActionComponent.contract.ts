import type { LedgerListAccountsResult } from '../../ledger/application/ledger.port';
import type { TransactionType } from './transactions.types';

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
    draftRequest?: {
      requestId: number;
      account: { id: string; name: string };
      type: TransactionType;
    };
  };
};

export type MovementQuickActionComponentProvided = {
  events?: {
    onCreateMovementRequested?: (movement: { account: { id: string; name: string }; type: TransactionType }) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type MovementQuickActionComponentProps = {
  required: MovementQuickActionComponentRequired;
  provided?: MovementQuickActionComponentProvided;
};
