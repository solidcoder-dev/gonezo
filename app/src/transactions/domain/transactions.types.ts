export type LoadPhase = 'idle' | 'loading' | 'ready' | 'error';

export type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';
export type TransactionType = Exclude<ComposerMode, 'picker'>;

export type TransactionFieldErrors = {
  amount?: string;
  transferAmountIn?: string;
  transferFxRate?: string;
  date?: string;
  recurrenceInterval?: string;
  recurrenceEndDate?: string;
  recurrenceEndCount?: string;
  expenseItemName?: string;
  expenseItemAmount?: string;
  expenseSplit?: string;
};

export type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};
