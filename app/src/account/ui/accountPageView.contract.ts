import type { FormEvent } from 'react';
import type { FieldErrors } from '../domain/accountPage.types';
import type { TransactionsImportRequest, TransactionsImportResult } from '../../imports/domain/transactionsImport.types';
import type { LedgerAccountItem, LedgerTransactionListItem } from '../../shared/domain/corePort';

export type LoadPhase = 'idle' | 'loading' | 'ready' | 'error';

export type AccountPageViewRequired = {
  screen: {
    loadPhase: LoadPhase;
    error: string;
  };
  toast: {
    message: string;
    actionLabel: string;
  };
  account: {
    loadPhase: LoadPhase;
    isRefreshing: boolean;
    isCreating: boolean;
    supportedCurrencies: string[];
    accounts: LedgerAccountItem[];
    selectedAccountId: string;
    selectedAccount?: LedgerAccountItem;
    balanceAmount: string;
    createForm: {
      isVisible: boolean;
      name: string;
      currency: string;
      openingBalance: string;
    };
    manage: {
      isOpen: boolean;
      name: string;
      isSubmitting: boolean;
    };
  };
  composer: {
    loadPhase: LoadPhase;
    isSubmitting: boolean;
    isOpen: boolean;
    mode: 'picker' | 'expense' | 'income' | 'transfer';
    advancedOpen: boolean;
    amount: string;
    date: string;
    note: string;
    categoryInput: string;
    categoryOptions: Array<{ id: string; name: string }>;
    tagInput: string;
    tagOptions: Array<{ id: string; name: string }>;
    transferTargetAccountId: string;
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
  };
  transactions: {
    loadPhase: LoadPhase;
    items: LedgerTransactionListItem[];
    hiddenCount: number;
    expanded: boolean;
    pendingVoidTransactionId: string;
  };
  imports: {
    sheetOpen: boolean;
    isSubmitting: boolean;
  };
};

export type AccountPageViewProvided = {
  toast: {
    dismiss: () => void;
    runAction: () => void;
  };
  account: {
    setNewAccountName: (value: string) => void;
    setNewAccountCurrency: (value: string) => void;
    setNewAccountOpeningBalance: (value: string) => void;
    submitCreateAccount: (event: FormEvent) => Promise<void>;
    openCreateAccountForm: () => void;
    closeCreateAccountForm: () => void;
    selectAccount: (accountId: string) => Promise<void>;
    openManageAccountSheet: () => void;
    closeManageAccountSheet: () => void;
    setManageAccountName: (value: string) => void;
    submitRenameAccount: (event: FormEvent) => Promise<void>;
    archiveSelectedAccount: () => Promise<void>;
    deleteSelectedAccount: () => Promise<void>;
  };
  composer: {
    openComposer: () => void;
    closeComposer: () => void;
    selectMode: (mode: 'expense' | 'income' | 'transfer') => void;
    toggleAdvanced: () => void;
    setAmount: (value: string) => void;
    setDate: (value: string) => void;
    setNote: (value: string) => void;
    setCategoryInput: (value: string) => void;
    setTagInput: (value: string) => void;
    setTransferTargetAccountId: (value: string) => void;
    setExpenseDetailed: (value: boolean) => void;
    setExpenseItemName: (value: string) => void;
    setExpenseItemAmount: (value: string) => void;
    addExpenseItem: () => void;
    removeExpenseItem: (itemId: string) => void;
    assignRemaining: () => void;
    submitTransaction: (event: FormEvent) => Promise<void>;
  };
  transactions: {
    expandHistory: () => void;
    voidTransaction: (transactionId: string) => void;
  };
  imports: {
    openSheet: () => void;
    closeSheet: () => void;
    submitImport: (input: TransactionsImportRequest) => Promise<TransactionsImportResult>;
  };
};

export type AccountPageViewProps = {
  required: AccountPageViewRequired;
  provided: AccountPageViewProvided;
};
