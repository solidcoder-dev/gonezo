export type OverviewStarterKey =
  | 'biggestExpense'
  | 'biggestIncome'
  | 'topTags'
  | 'sharedExpenses'
  | 'mostSharedWith'
  | 'recurringImpact'
  | 'transfers';

export type OverviewStarterItemView = {
  key: string;
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
    config?: {
      title?: string;
      ariaLabel?: string;
      sheetTitle?: string;
      emptyLabel?: string;
      loadingLabel?: string;
    };
  };
};
