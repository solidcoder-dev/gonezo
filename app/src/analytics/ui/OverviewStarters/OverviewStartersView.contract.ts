export type OverviewStarterKey =
  | 'biggestExpense'
  | 'biggestIncome'
  | 'topTags'
  | 'sharedExpenses'
  | 'mostSharedWith'
  | 'recurringImpact'
  | 'transfers';

export type OverviewStarterItemView = {
  key: OverviewStarterKey;
  label: string;
  primaryText: string;
  amount: string;
  supportingText?: string;
  tone: 'income' | 'expense' | 'sharing' | 'recurring' | 'transfer' | 'neutral';
  icon: 'expense' | 'income' | 'tag' | 'sharing' | 'recurring' | 'transfer';
};

export type OverviewStartersViewProps = {
  required: {
    data: {
      previewItems: OverviewStarterItemView[];
      allItems: OverviewStarterItemView[];
    };
    status: {
      loading: boolean;
    };
  };
};
