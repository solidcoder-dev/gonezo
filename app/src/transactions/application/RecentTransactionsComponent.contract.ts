import type { TransactionsCorePort } from './transactionsCore.port';

export type RecentTransactionsComponentRequired = {
  context: {
    accountId: string | null;
    core: TransactionsCorePort;
  };
  config: {
    enabled: boolean;
    refreshSignal: boolean;
  };
};

export type RecentTransactionsComponentProvided = {
  events?: {
    onVoided?: (transactionId: string) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type RecentTransactionsComponentProps = {
  required: RecentTransactionsComponentRequired;
  provided?: RecentTransactionsComponentProvided;
};
