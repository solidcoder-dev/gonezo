import type { ComposerMode } from '../domain/transactions.types';
import type { TransactionsCorePort } from './transactionsCore.port';
import type {
  RecurrenceEndInput,
  RecurrenceFrequency,
  RecurrenceMonthlyPattern,
} from '../../shared/domain/corePort';

export type TransactionEntryPrefillRequest = {
  requestId: number;
  editedExpectedMovementId?: string;
  editedScheduledMovementId?: string;
  postExpectedMovementId?: string;
  mode: ComposerMode;
  amount: string;
  date: string;
  note?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
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
    core: TransactionsCorePort;
  };
  config: {
    enabled: boolean;
    prefillRequest?: TransactionEntryPrefillRequest;
  };
};

export type TransactionEntryComponentProvided = {
  events?: {
    onRecorded?: () => void;
    onError?: (error: { message: string }) => void;
  };
};

export type TransactionEntryComponentProps = {
  required: TransactionEntryComponentRequired;
  provided?: TransactionEntryComponentProvided;
};
