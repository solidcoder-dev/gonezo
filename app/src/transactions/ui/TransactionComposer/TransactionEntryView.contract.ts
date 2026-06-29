import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import type { ComposerMode, TransactionFieldErrors } from '../../application/transactions.types';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../../shared/domain/schedulingView.types';
import type { ShareDraft, SharingPersonSuggestion } from '../../../sharing/domain/shareDraft';

export type TransactionEntryViewRequired = {
  state: {
    open: boolean;
    mode: ComposerMode;
    advancedOpen: boolean;
    amount: string;
    date: string;
    nextScheduledOccurrenceDate?: string;
    note: string;
    categoryId: string;
    categoryOptions: Array<{ id: string; name: string }>;
    tagInput: string;
    selectedTagOptions: Array<{ id: string; name: string }>;
    tagSuggestions: Array<{ id: string; name: string }>;
    tagCreateCandidate?: string;
    transferTargetAccountId: string;
    sourceAccountId: string;
    sourceAccountOptions: Array<{ id: string; name: string; currency: string; type?: string }>;
    transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
    transferAmountIn: string;
    transferFxRate: string;
    transferFxMode: 'auto_destination' | 'auto_rate';
    transferDestinationCurrency?: string;
    transferCrossCurrency: boolean;
    splitEnabled: boolean;
    splitEditorOpen: boolean;
    splitApplied: boolean;
    splitDraftMode: 'items' | 'parts';
    splitItems: Array<{ id: string; name: string; amount: string }>;
    splitItemOptions: Array<{ id: string; name: string; amount: string }>;
    splitItemName: string;
    splitItemAmount: string;
    editingSplitItemId: string;
    splitTotal: string;
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
    scheduleEditorOpen: boolean;
    expected: boolean;
    shareEditorOpen: boolean;
    shareDraft?: ShareDraft;
    shareSummary?: { peopleCount: number; total: string };
    sharePeopleSuggestions: SharingPersonSuggestion[];
    shareControl?: ReactNode;
    shareEditorBody?: ReactNode;
    editedScheduledMovementId?: string;
    postExpectedMovementId?: string;
    currencyCode?: string;
    movementAccountContext?: {
      name: string;
      type?: Exclude<ComposerMode, 'picker'>;
    };
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
    collapse?: () => void;
    selectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
    selectSourceAccount: (accountId: string) => void;
    toggleAdvanced: () => void;
    setAmount: (value: string) => void;
    setDate: (value: string) => void;
    setNote: (value: string) => void;
    setCategoryId: (value: string) => void;
    setTagInput: (value: string) => void;
    selectTag: (tagId: string) => void;
    createTag: (name: string) => void;
    removeTag: (tagId: string) => void;
    removeLastTag: () => void;
    setTransferTarget: (value: string) => void;
    setTransferAmountIn: (value: string) => void;
    setTransferFxRate: (value: string) => void;
    setTransferFxMode: (value: 'auto_destination' | 'auto_rate') => void;
    setSplitEnabled: (value: boolean) => void;
    openSplitEditor: () => void;
    closeSplitEditor: () => void;
    applySplit: () => void;
    removeSplit: () => void;
    setSplitItemName: (value: string) => void;
    setSplitItemAmount: (value: string) => void;
    startSplitItem: () => void;
    cancelSplitItem: () => void;
    addSplitItem: () => boolean;
    editSplitItem: (itemId: string) => void;
    removeSplitItem: (itemId: string) => void;
    splitByParts: (amount: string, parts: string, addedPersonName?: string) => void;
    splitByWeightedParts: (amount: string, parts: Array<{ id?: string; name: string; parts: number }>) => void;
    selectSplitMode: (mode: 'items' | 'parts') => void;
    setSchedulingMode: (value: 'now' | 'scheduled') => void;
    setSchedulingKind: (value: 'one_shot' | 'recurring') => void;
    openRecurringScheduleEditor: () => void;
    applyRecurringSchedule: () => void;
    closeRecurringScheduleEditor: () => void;
    removeRecurringSchedule: () => void;
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
    openShareEditor: () => void;
    closeShareEditor: () => void;
    applyShareDraft: (summary: { peopleCount: number; total: string }, draft: ShareDraft) => void;
    removeShareDraft: () => void;
    submit: (event: FormEvent) => Promise<void>;
  };
};

export type TransactionEntryViewProps = {
  required: TransactionEntryViewRequired;
  provided: TransactionEntryViewProvided;
};
