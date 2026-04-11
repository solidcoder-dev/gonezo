import type { FormEvent } from 'react';
import type { ComposerMode, TransactionFieldErrors } from '../domain/transactions.types';

export type TransactionEntryViewRequired = {
  state: {
    open: boolean;
    mode: ComposerMode;
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
    transferAmountIn: string;
    transferFxRate: string;
    transferFxMode: 'auto_destination' | 'auto_rate';
    transferDestinationCurrency?: string;
    transferCrossCurrency: boolean;
    splitEnabled: boolean;
    splitItems: Array<{ id: string; name: string; amount: string }>;
    splitItemName: string;
    splitItemAmount: string;
    splitRemaining: string;
    currencyCode?: string;
  };
  status: {
    submitting: boolean;
    disabled: boolean;
    errors: TransactionFieldErrors;
  };
};

export type TransactionEntryViewProvided = {
  commands: {
    open: () => void;
    close: () => void;
    selectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
    toggleAdvanced: () => void;
    setAmount: (value: string) => void;
    setDate: (value: string) => void;
    setNote: (value: string) => void;
    setCategoryInput: (value: string) => void;
    setTagInput: (value: string) => void;
    setTransferTarget: (value: string) => void;
    setTransferAmountIn: (value: string) => void;
    setTransferFxRate: (value: string) => void;
    setTransferFxMode: (value: 'auto_destination' | 'auto_rate') => void;
    setSplitEnabled: (value: boolean) => void;
    setSplitItemName: (value: string) => void;
    setSplitItemAmount: (value: string) => void;
    addSplitItem: () => void;
    removeSplitItem: (itemId: string) => void;
    assignSplitRemaining: () => void;
    submit: (event: FormEvent) => Promise<void>;
  };
};

export type TransactionEntryViewProps = {
  required: TransactionEntryViewRequired;
  provided: TransactionEntryViewProvided;
};
