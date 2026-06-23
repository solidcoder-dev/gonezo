export type CashFlowSummaryCardView = {
  key: 'income' | 'expense' | 'netFlow';
  label: string;
  amount: string;
  iconClassName: string;
  tone: 'income' | 'expense' | 'net';
};

export type CashFlowSummaryCardsViewProps = {
  required: {
    data: {
      cards: CashFlowSummaryCardView[];
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: Record<string, never>;
  };
};
