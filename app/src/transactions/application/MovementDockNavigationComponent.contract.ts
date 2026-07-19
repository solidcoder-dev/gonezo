import type { MovementQuickActionComponentPort } from './MovementQuickActionComponent.contract';
import type { MovementQuickActionErrorNotice } from './MovementQuickActionComponent.contract';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import type { TransactionType } from './transactions.types';

export type MovementDockNavigationComponentRequired = {
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

export type MovementDockNavigationComponentProvided = {
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

export type MovementDockNavigationComponentProps = {
  required: MovementDockNavigationComponentRequired;
  provided?: MovementDockNavigationComponentProvided;
};
