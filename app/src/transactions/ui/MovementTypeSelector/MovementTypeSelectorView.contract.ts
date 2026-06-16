import type { TransactionType } from '../../application/transactions.types';

export type MovementTypeSelectorViewProps = {
  required: {
    state: {
      open: boolean;
      selectedType: TransactionType;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      selectType: (type: TransactionType) => void;
    };
  };
};
