export type FieldErrors = {
  amount?: string;
  date?: string;
  expenseItemName?: string;
  expenseItemAmount?: string;
  expenseSplit?: string;
};

export type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';

export type TransactionType = Exclude<ComposerMode, 'picker'>;

export type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};

export type TaxonomyCategoryAppliesTo = 'income' | 'expense';
