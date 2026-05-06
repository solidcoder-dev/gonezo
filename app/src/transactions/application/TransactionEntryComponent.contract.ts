import type { TransactionsCorePort } from './transactionsCore.port';

export type TransactionEntryPrefillRequest = {
  requestId: number;
  editedExpectedMovementId?: string;
  mode: 'expense' | 'income';
  amount: string;
  date: string;
  note?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
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
