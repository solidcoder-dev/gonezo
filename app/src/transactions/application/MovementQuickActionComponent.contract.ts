import type { LedgerListAccountsResult } from '../../ledger/application/ledger.port';
import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import type { MovementEntryCategoryOption } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import type { MovementVoiceEntryContext } from './MovementVoiceEntry/movementVoiceEntryContext';
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

export type MovementQuickActionNotice = Readonly<{
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  action?: Readonly<{
    label: string;
    run: () => void;
  }>;
}>;

export type MovementQuickActionComponentRequired = {
  context: {
    core: MovementQuickActionComponentPort;
    voiceEntry: MovementVoiceEntryContext;
  };
  config: {
    enabled: boolean;
    refreshSignal: boolean;
    voiceInterpretationContext?: {
      currentDate: string;
      timeZone: string;
      locale: string;
      categoryOptions: ReadonlyArray<MovementEntryCategoryOption>;
    };
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
    onMovementEntryDraftReady?: (
      movement: {
        account: { id: string; name: string; currency: string };
        draft: MovementEntryDraft;
      },
    ) => Promise<void> | void;
    onError?: (error: MovementQuickActionErrorNotice) => void;
    onNotice?: (notice: MovementQuickActionNotice) => void;
  };
};

export type MovementQuickActionComponentProps = {
  required: MovementQuickActionComponentRequired;
  provided?: MovementQuickActionComponentProvided;
};
