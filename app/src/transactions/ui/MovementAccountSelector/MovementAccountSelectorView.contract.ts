export type MovementAccountSelectorItem = {
  id: string;
  name: string;
  currency: string;
  balanceLabel?: string;
};

export type MovementAccountSelectorViewProps = {
  required: {
    data: {
      accounts: MovementAccountSelectorItem[];
    };
    state: {
      open: boolean;
      selectedAccountId: string;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      close: () => void;
      selectAccount: (accountId: string) => void;
    };
  };
};
