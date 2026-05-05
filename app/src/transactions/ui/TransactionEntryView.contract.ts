import type { FormEvent } from 'react';
import type { ComposerMode, TransactionFieldErrors } from '../domain/transactions.types';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../shared/domain/schedulingView.types';

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
    schedulingMode: 'now' | 'scheduled';
    schedulingKind: 'one_shot' | 'recurring';
    recurrenceFrequency: RecurrenceFrequency;
    recurrenceInterval: string;
    recurrenceWeeklyDay: string;
    recurrenceMonthlyPattern: RecurrenceMonthlyPattern;
    recurrenceDayOfMonth: string;
    recurrenceMonthlyOrdinal: string;
    recurrenceMonthlyWeekday: string;
    recurrenceEndKind: RecurrenceEndInput['kind'];
    recurrenceEndDate: string;
    recurrenceEndCount: string;
    expected: boolean;
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
    setSchedulingMode: (value: 'now' | 'scheduled') => void;
    setSchedulingKind: (value: 'one_shot' | 'recurring') => void;
    setRecurrenceFrequency: (value: RecurrenceFrequency) => void;
    setRecurrenceInterval: (value: string) => void;
    setRecurrenceWeeklyDay: (value: string) => void;
    setRecurrenceMonthlyPattern: (value: RecurrenceMonthlyPattern) => void;
    setRecurrenceDayOfMonth: (value: string) => void;
    setRecurrenceMonthlyOrdinal: (value: string) => void;
    setRecurrenceMonthlyWeekday: (value: string) => void;
    setRecurrenceEndKind: (value: RecurrenceEndInput['kind']) => void;
    setRecurrenceEndDate: (value: string) => void;
    setRecurrenceEndCount: (value: string) => void;
    setExpected: (value: boolean) => void;
    submit: (event: FormEvent) => Promise<void>;
  };
};

export type TransactionEntryViewProps = {
  required: TransactionEntryViewRequired;
  provided: TransactionEntryViewProvided;
};
