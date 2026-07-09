export type OverviewInsightsRailItemView = {
  key: 'topTags' | 'sharedExpenses' | 'mostSharedWith' | 'recurringImpact' | 'transfers';
  title: string;
  subtitle: string;
  amount: string;
  iconClassName: string;
  tone: 'expense' | 'sharing' | 'recurring' | 'transfer';
};

export type OverviewInsightsRailViewProps = {
  required: {
    data: {
      items: OverviewInsightsRailItemView[];
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
