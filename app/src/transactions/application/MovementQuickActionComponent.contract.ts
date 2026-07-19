import type { LedgerListAccountsResult } from '../../ledger/application/ledger.port';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import type { TransactionType } from './transactions.types';

export type MovementQuickActionPreferencesPort = {
  preferencesGet(): Promise<{ defaultAccountId?: string | null }>;
};

export type MovementQuickActionAccountsPort = {
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
};

export type MovementQuickActionComponentPort = MovementQuickActionAccountsPort & MovementQuickActionPreferencesPort;

export type MovementQuickActionErrorNotice = Readonly<{
  message: string;
  tone?: 'warning' | 'error';
  action?: Readonly<{
    label: string;
    run: () => void;
  }>;
}>;

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
    onCreateMovementRequested?: (
      movement: {
        account: { id: string; name: string };
        type: TransactionType;
        prefillRequest?: TransactionEntryPrefillRequest;
      },
    ) => void;
    onError?: (error: MovementQuickActionErrorNotice) => void;
  };
};

export type MovementQuickActionComponentProps = {
  required: MovementQuickActionComponentRequired;
  provided?: MovementQuickActionComponentProvided;
};
