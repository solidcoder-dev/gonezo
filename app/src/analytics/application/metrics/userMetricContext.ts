export type UserMetricFact = Readonly<{
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: string;
}>;

export type UserMetricContext = Readonly<{
  currency: string;
  currentPeriodFacts: readonly UserMetricFact[];
  comparisonPeriodFacts?: readonly UserMetricFact[];
}>;
