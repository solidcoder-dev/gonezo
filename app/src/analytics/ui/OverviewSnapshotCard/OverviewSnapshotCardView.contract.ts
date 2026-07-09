export type OverviewSnapshotHighlightView = {
  key: 'expense' | 'income';
  label: string;
  title: string;
  subtitle?: string;
  amount: string;
  occurredOn: string;
  iconClassName: string;
  tone: 'expense' | 'income';
};

export type OverviewSnapshotCardViewProps = {
  required: {
    data: {
      currentWindowLabel: string;
      previousWindowLabel?: string;
      comparisonPercent?: string;
      incomeAmount: string;
      expenseAmount: string;
      netFlowAmount: string;
      incomeShare: number;
      expenseShare: number;
      highlights: OverviewSnapshotHighlightView[];
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
