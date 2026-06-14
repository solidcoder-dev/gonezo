export type MovementQuickActionViewProps = {
  required: {
    state: {
      accountName: string;
      selectorOpen: boolean;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      createMovement: () => void;
      toggleAccountSelector: () => void;
    };
  };
};
