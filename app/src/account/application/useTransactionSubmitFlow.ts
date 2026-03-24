import type { FormEvent } from 'react';

type TransactionSubmitFlowSlice = {
  postingTransaction: boolean;
  fieldErrors: {
    amount?: string;
    date?: string;
  };
  composerOpen: boolean;
  composerMode: 'picker' | 'expense' | 'income' | 'transfer';
  composerAdvancedOpen: boolean;
  transactionAmount: string;
  transactionDate: string;
  transactionNote: string;
  transactionCategoryInput: string;
  transactionTagInput: string;
  categoryOptions: Array<{ id: string; name: string }>;
  tagOptions: Array<{ id: string; name: string }>;
  transferToAccountId: string;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  expenseDetailed: boolean;
  expenseItems: Array<{ id: string; name: string; amount: string }>;
  expenseItemName: string;
  expenseItemAmount: string;
  expenseRemaining: string;
  expenseItemNameError?: string;
  expenseItemAmountError?: string;
  expenseSplitError?: string;
  setTransactionAmount: (value: string) => void;
  setTransactionDate: (value: string) => void;
  setTransactionNote: (value: string) => void;
  setTransactionCategoryInput: (value: string) => void;
  setTransactionTagInput: (value: string) => void;
  setTransferToAccountId: (value: string) => void;
  setExpenseDetailed: (value: boolean) => void;
  setExpenseItemName: (value: string) => void;
  setExpenseItemAmount: (value: string) => void;
  openTransactionComposer: () => void;
  closeTransactionComposer: () => void;
  selectComposerMode: (mode: 'expense' | 'income' | 'transfer') => void;
  toggleComposerAdvanced: () => void;
  addExpenseItem: () => void;
  removeExpenseItem: (itemId: string) => void;
  assignRemaining: () => void;
  submitTransaction: (event: FormEvent) => Promise<void>;
};

export function useTransactionSubmitFlow<T extends TransactionSubmitFlowSlice>(model: T): TransactionSubmitFlowSlice {
  return {
    postingTransaction: model.postingTransaction,
    fieldErrors: model.fieldErrors,
    composerOpen: model.composerOpen,
    composerMode: model.composerMode,
    composerAdvancedOpen: model.composerAdvancedOpen,
    transactionAmount: model.transactionAmount,
    transactionDate: model.transactionDate,
    transactionNote: model.transactionNote,
    transactionCategoryInput: model.transactionCategoryInput,
    transactionTagInput: model.transactionTagInput,
    categoryOptions: model.categoryOptions,
    tagOptions: model.tagOptions,
    transferToAccountId: model.transferToAccountId,
    transferTargetOptions: model.transferTargetOptions,
    expenseDetailed: model.expenseDetailed,
    expenseItems: model.expenseItems,
    expenseItemName: model.expenseItemName,
    expenseItemAmount: model.expenseItemAmount,
    expenseRemaining: model.expenseRemaining,
    expenseItemNameError: model.expenseItemNameError,
    expenseItemAmountError: model.expenseItemAmountError,
    expenseSplitError: model.expenseSplitError,
    setTransactionAmount: model.setTransactionAmount,
    setTransactionDate: model.setTransactionDate,
    setTransactionNote: model.setTransactionNote,
    setTransactionCategoryInput: model.setTransactionCategoryInput,
    setTransactionTagInput: model.setTransactionTagInput,
    setTransferToAccountId: model.setTransferToAccountId,
    setExpenseDetailed: model.setExpenseDetailed,
    setExpenseItemName: model.setExpenseItemName,
    setExpenseItemAmount: model.setExpenseItemAmount,
    openTransactionComposer: model.openTransactionComposer,
    closeTransactionComposer: model.closeTransactionComposer,
    selectComposerMode: model.selectComposerMode,
    toggleComposerAdvanced: model.toggleComposerAdvanced,
    addExpenseItem: model.addExpenseItem,
    removeExpenseItem: model.removeExpenseItem,
    assignRemaining: model.assignRemaining,
    submitTransaction: model.submitTransaction,
  };
}
