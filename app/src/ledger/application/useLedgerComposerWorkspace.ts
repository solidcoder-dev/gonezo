import type { FormEvent } from 'react';

type FieldErrors = {
  amount?: string;
  date?: string;
  expenseItemName?: string;
  expenseItemAmount?: string;
  expenseSplit?: string;
};

type LedgerComposerWorkspaceSlice = {
  postingTransaction: boolean;
  composerOpen: boolean;
  composerMode: 'picker' | 'expense' | 'income' | 'transfer';
  composerAdvancedOpen: boolean;
  transactionAmount: string;
  transactionDate: string;
  transactionNote: string;
  transferToAccountId: string;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  expenseDetailed: boolean;
  expenseItems: Array<{ id: string; name: string; amount: string }>;
  expenseItemName: string;
  expenseItemAmount: string;
  expenseRemaining: string;
  fieldErrors: FieldErrors;
  expenseItemNameError?: string;
  expenseItemAmountError?: string;
  expenseSplitError?: string;
  openTransactionComposer: () => void;
  closeTransactionComposer: () => void;
  selectComposerMode: (mode: 'expense' | 'income' | 'transfer') => void;
  toggleComposerAdvanced: () => void;
  setTransactionAmount: (value: string) => void;
  setTransactionDate: (value: string) => void;
  setTransactionNote: (value: string) => void;
  setTransferToAccountId: (value: string) => void;
  setExpenseDetailed: (value: boolean) => void;
  setExpenseItemName: (value: string) => void;
  setExpenseItemAmount: (value: string) => void;
  addExpenseItem: () => void;
  removeExpenseItem: (itemId: string) => void;
  assignRemaining: () => void;
  submitTransaction: (event: FormEvent) => Promise<void>;
};

export function useLedgerComposerWorkspace<T extends LedgerComposerWorkspaceSlice>(model: T) {
  return {
    state: {
      postingTransaction: model.postingTransaction,
      composerOpen: model.composerOpen,
      composerMode: model.composerMode,
      composerAdvancedOpen: model.composerAdvancedOpen,
      transactionAmount: model.transactionAmount,
      transactionDate: model.transactionDate,
      transactionNote: model.transactionNote,
      transferToAccountId: model.transferToAccountId,
      transferTargetOptions: model.transferTargetOptions,
      expenseDetailed: model.expenseDetailed,
      expenseItems: model.expenseItems,
      expenseItemName: model.expenseItemName,
      expenseItemAmount: model.expenseItemAmount,
      expenseRemaining: model.expenseRemaining,
      fieldErrors: model.fieldErrors,
      expenseItemNameError: model.expenseItemNameError,
      expenseItemAmountError: model.expenseItemAmountError,
      expenseSplitError: model.expenseSplitError,
    },
    actions: {
      openTransactionComposer: model.openTransactionComposer,
      closeTransactionComposer: model.closeTransactionComposer,
      selectComposerMode: model.selectComposerMode,
      toggleComposerAdvanced: model.toggleComposerAdvanced,
      setTransactionAmount: model.setTransactionAmount,
      setTransactionDate: model.setTransactionDate,
      setTransactionNote: model.setTransactionNote,
      setTransferToAccountId: model.setTransferToAccountId,
      setExpenseDetailed: model.setExpenseDetailed,
      setExpenseItemName: model.setExpenseItemName,
      setExpenseItemAmount: model.setExpenseItemAmount,
      addExpenseItem: model.addExpenseItem,
      removeExpenseItem: model.removeExpenseItem,
      assignRemaining: model.assignRemaining,
      submitTransaction: model.submitTransaction,
    },
  };
}
