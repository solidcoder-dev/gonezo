import type { ComposerMode } from './transactions.types';
import type { TransactionsPort } from './transactions.port';
import type {
  RecurrenceEndInput,
  RecurrenceFrequency,
  RecurrenceMonthlyPattern,
} from '../../scheduling/application/scheduling.port';
import type { ShareDraft } from '../../sharing/domain/shareDraft';
import type { MovementReuseSuggestionsPort } from '../../movements/application/movementReuseSuggestions.port';

export type TransactionEntryPrefillRequest = {
  requestId: number;
  initialIntent?: 'now' | 'expected' | 'scheduled';
  editedExpectedMovementId?: string;
  editedScheduledMovementId?: string;
  postExpectedMovementId?: string;
  mode: ComposerMode;
  amount: string;
  date: string;
  note?: string;
  categoryId?: string;
  tagNames?: string[];
  shareDraft?: ShareDraft;
  movementIgnored?: boolean;
  splitItems?: Array<{ id?: string; name: string; amount: string }>;
  transferTargetAccountId?: string;
  transferAmountIn?: string;
  transferFxRate?: string;
  transferFxMode?: 'auto_destination' | 'auto_rate';
  transferDestinationCurrency?: string;
  schedulingMode?: 'now' | 'scheduled';
  schedulingKind?: 'one_shot' | 'recurring';
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceInterval?: string;
  recurrenceWeeklyDay?: string;
  recurrenceMonthlyPattern?: RecurrenceMonthlyPattern;
  recurrenceDayOfMonth?: string;
  recurrenceMonthlyOrdinal?: string;
  recurrenceMonthlyWeekday?: string;
  recurrenceEndKind?: RecurrenceEndInput['kind'];
  recurrenceEndDate?: string;
  recurrenceEndCount?: string;
};

export type TransactionEntryComponentRequired = {
  context: {
    accountId: string | null;
    core: TransactionsPort & Partial<MovementReuseSuggestionsPort>;
  };
  config: {
    enabled: boolean;
    prefillRequest?: TransactionEntryPrefillRequest;
    openSignal?: number;
    initialMode?: Exclude<ComposerMode, 'picker'>;
    movementAccountContext?: {
      name: string;
      type?: Exclude<ComposerMode, 'picker'>;
    };
  };
};

export type TransactionEntryComponentProvided = {
  events?: {
    onRecorded?: () => void;
    onClosed?: () => void;
    onAccountChanged?: (account: { id: string; name: string }) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type TransactionEntryComponentProps = {
  required: TransactionEntryComponentRequired;
  provided?: TransactionEntryComponentProvided;
};
