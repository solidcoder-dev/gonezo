import type { TransactionHistoryItemView } from '../domain/transactionView.types';

export type TransactionHistoryViewRequired = {
  state: {
    items: TransactionHistoryItemView[];
    hiddenCount: number;
    expanded: boolean;
    pendingVoidTransactionId?: string;
  };
  status: {
    loading: boolean;
    mutating: boolean;
    disabled: boolean;
  };
};

export type TransactionHistoryViewProvided = {
  commands: {
    expandHistory: () => void;
    requestVoid: (transactionId: string) => void;
    undoVoid: () => void;
  };
};

export type TransactionHistoryViewProps = {
  required: TransactionHistoryViewRequired;
  provided: TransactionHistoryViewProvided;
};
