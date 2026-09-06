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
  expectedConflict?: string;
  expenseItemName?: string;
  expenseItemAmount?: string;
  expenseSplit?: string;
};

import type { ExpenseSplitItem } from '../domain/expenseSplit';

export type ExpenseItemDraft = ExpenseSplitItem & {
  tagNames?: string[];
};
