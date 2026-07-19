import type { MovementQuickActionComponentPort } from './MovementQuickActionComponent.contract';
import type { MovementQuickActionComponentProvided } from './MovementQuickActionComponent.contract';
import type { TransactionType } from './transactions.types';
import type { MovementVoiceEntryContext } from './MovementVoiceEntry/movementVoiceEntryContext';
import type { MovementVoiceEntryNotice, MovementVoiceEntryErrorNotice, MovementVoiceEntrySelectedAccount } from './MovementVoiceEntryComponent.contract';
import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';

export type ExperimentalMovementDockNavigationComponentRequired = Readonly<{
  context: Readonly<{
    core: MovementQuickActionComponentPort;
    voiceEntry: MovementVoiceEntryContext;
  }>;
  config: Readonly<{
    enabled: boolean;
    refreshSignal: boolean;
    draftRequest?: Readonly<{
      requestId: number;
      account: Readonly<{
        id: string;
        name: string;
      }>;
      type: TransactionType;
    }>;
    voiceInterpretationContext?: Readonly<{
      currentDate?: string;
      timeZone?: string;
      locale?: string;
    }>;
  }>;
}>;

export type ExperimentalMovementDockNavigationComponentProvided = Readonly<{
  events?: Readonly<{
    onCreateMovementRequested?: NonNullable<NonNullable<MovementQuickActionComponentProvided['events']>['onCreateMovementRequested']>;
    onMovementEntryDraftReady?: (
      movement: Readonly<{
        account: MovementVoiceEntrySelectedAccount;
        draft: MovementEntryDraft;
      }>,
    ) => Promise<void> | void;
    onNotice?: (notice: MovementVoiceEntryNotice) => void;
    onError?: (error: MovementVoiceEntryErrorNotice) => void;
    onBusyChanged?: (busy: boolean) => void;
  }>;
}>;

export type ExperimentalMovementDockNavigationComponentProps = Readonly<{
  required: ExperimentalMovementDockNavigationComponentRequired;
  provided?: ExperimentalMovementDockNavigationComponentProvided;
}>;
