export type AnalyticsHighlightViewModel = {
  key: string;
  label: string;
  title?: string;
  formattedAmount?: string;
  supportingText?: string;
  tone: 'income' | 'expense' | 'sharing' | 'recurring' | 'transfer' | 'neutral';
};
