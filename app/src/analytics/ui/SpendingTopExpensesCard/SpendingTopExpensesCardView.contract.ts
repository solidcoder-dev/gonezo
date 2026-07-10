export type SpendingTopExpenseView = {
  key: string;
  title: string;
  amount: string;
  occurredAtLabel: string;
};

export type SpendingTopExpensesCardViewProps = {
  required: {
    data: {
      items: SpendingTopExpenseView[];
    };
    status: {
      loading: boolean;
    };
  };
  provided: {
    commands: Record<string, never>;
  };
};
