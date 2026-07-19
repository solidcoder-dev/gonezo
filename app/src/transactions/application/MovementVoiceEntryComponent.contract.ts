import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import type { MovementVoiceEntryContext } from './MovementVoiceEntry/movementVoiceEntryContext';
export type {
  MovementVoiceEntryCategoryItem,
  MovementVoiceEntryCategorySourcePort,
  MovementVoiceEntryCategorySourceResult,
} from './MovementVoiceEntry/MovementVoiceEntryCategorySourcePort';

export type MovementVoiceEntrySelectedAccount = Readonly<{
  id: string;
  name: string;
  currency: string;
}>;

export type MovementVoiceEntryNoticeAction = Readonly<{
  label: string;
  run: () => void;
}>;

export type MovementVoiceEntryNotice = Readonly<{
  message: string;
  tone: 'success' | 'info' | 'warning' | 'error';
  action?: MovementVoiceEntryNoticeAction;
}>;

export type MovementVoiceEntryErrorNotice = Readonly<{
  message: string;
  tone: 'warning' | 'error';
  action?: MovementVoiceEntryNoticeAction;
}>;

export type MovementVoiceEntryComponentRequired = {
  context: {
    voiceEntry: MovementVoiceEntryContext;
  };
  config: {
    enabled: boolean;
    selectedAccount: MovementVoiceEntrySelectedAccount | null;
    voiceInterpretationContext?: {
      currentDate?: string;
      timeZone?: string;
      locale?: string;
    };
  };
};

export type MovementVoiceEntryComponentProvided = {
  events?: {
    onMovementEntryDraftReady?: (
      movement: {
        account: MovementVoiceEntrySelectedAccount;
        draft: MovementEntryDraft;
      },
    ) => Promise<void> | void;
    onError?: (error: MovementVoiceEntryErrorNotice) => void;
    onNotice?: (notice: MovementVoiceEntryNotice) => void;
  };
};

export type MovementVoiceEntryComponentProps = {
  required: MovementVoiceEntryComponentRequired;
  provided?: MovementVoiceEntryComponentProvided;
};
