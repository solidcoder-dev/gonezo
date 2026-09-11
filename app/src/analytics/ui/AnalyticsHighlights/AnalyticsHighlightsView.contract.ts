export type OverviewStarterItemView = {
  key: string;
  label: string;
  primaryText: string;
  amount: string;
  supportingText?: string;
  tone: 'income' | 'expense' | 'sharing' | 'recurring' | 'transfer' | 'neutral';
  icon: 'expense' | 'income' | 'tag' | 'sharing' | 'recurring' | 'transfer';
};
