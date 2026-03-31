import type { TransactionsCorePort } from './transactionsCore.port';

export type TransactionEntryComponentRequired = {
  context: {
    accountId: string | null;
    core: TransactionsCorePort;
  };
  config: {
    enabled: boolean;
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
