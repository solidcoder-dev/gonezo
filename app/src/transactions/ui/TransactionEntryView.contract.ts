import type { FormEvent } from 'react';
import type { ComposerMode, TransactionFieldErrors } from '../domain/transactions.types';

export type TransactionEntryViewRequired = {
  state: {
    open: boolean;
    mode: ComposerMode;
    voicePhase: 'idle' | 'recording' | 'processing';
    voiceMode: Exclude<ComposerMode, 'picker'> | null;
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
    voiceProcessing: boolean;
    errors: TransactionFieldErrors;
  };
};

export type TransactionEntryViewProvided = {
  commands: {
    open: () => void;
    close: () => void;
    startVoiceCapture: (mode: Exclude<ComposerMode, 'picker'>) => void;
    cancelVoiceCapture: () => void;
    confirmVoiceCapture: () => Promise<void>;
    selectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
    toggleAdvanced: () => void;
    setAmount: (value: string) => void;
    setDate: (value: string) => void;
    setNote: (value: string) => void;
    setCategoryInput: (value: string) => void;
    setTagInput: (value: string) => void;
    setTransferTarget: (value: string) => void;
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
