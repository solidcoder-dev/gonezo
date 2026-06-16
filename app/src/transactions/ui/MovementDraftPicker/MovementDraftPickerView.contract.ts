import type { TransactionType } from '../../application/transactions.types';

export type MovementDraftPickerViewProps = {
  required: {
    state: {
      open: boolean;
      accountName: string;
      movementType: TransactionType;
      accountSelectorOpen: boolean;
      typeSelectorOpen: boolean;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      expand: () => void;
      toggleAccountSelector: () => void;
      toggleTypeSelector: () => void;
    };
  };
};
