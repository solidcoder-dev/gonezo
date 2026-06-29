import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import { MultiTagPickerView } from '../../../shared/ui/MultiTagPicker/MultiTagPickerView';
import {
  FREQUENT_EXPENSE_CATEGORY_IDS,
  FREQUENT_INCOME_CATEGORY_IDS,
} from '../../../taxonomy/domain/masterCategories';
import { CategoryPickerField } from '../CategoryPickerField/CategoryPickerField';
import { ExpenseSplitEditorView } from '../ExpenseSplitEditor/ExpenseSplitEditorView';
import { RecurrenceEditorView } from '../RecurrenceEditor/RecurrenceEditorView';
import { ScheduleSummaryView } from '../ScheduleControls/ScheduleSummaryView';
import { ScheduleTriggerView } from '../ScheduleControls/ScheduleTriggerView';
import { ShareControlsView } from '../ShareControls/ShareControlsView';
import { ShareExpenseEditorView } from '../ShareExpenseEditor/ShareExpenseEditorView';
import { SplitSummaryView } from '../SplitControls/SplitSummaryView';
import { SplitTriggerView } from '../SplitControls/SplitTriggerView';
import { TransactionComposerActionsView } from '../TransactionComposerActions/TransactionComposerActionsView';
import { TransactionMainFieldsView } from '../TransactionMainFields/TransactionMainFieldsView';
import { TransferFxFieldsView } from '../TransferFxFields/TransferFxFieldsView';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../../shared/domain/schedulingView.types';
import './TransactionComposerView.css';

export type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';

export type ComposerExpenseItem = {
  id: string;
  name: string;
  amount: string;
};

export type TransactionComposerViewRequired = {
  open: boolean;
  mode: ComposerMode;
  disabled: boolean;
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
  advancedOpen: boolean;
  transferTargetAccountId: string;
  sourceAccountId: string;
  sourceAccountOptions: Array<{ id: string; name: string; currency: string; type?: string }>;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
  transferDestinationCurrency?: string;
  transferCrossCurrency: boolean;
  expenseDetailed: boolean;
  splitEditorOpen: boolean;
  splitApplied: boolean;
  splitDraftMode: 'items' | 'parts';
  expenseItems: ComposerExpenseItem[];
  expenseItemOptions: ComposerExpenseItem[];
  expenseItemName: string;
  expenseItemAmount: string;
  editingExpenseItemId: string;
  expenseSplitTotal: string;
  expenseSplitRemaining: string;
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
  editedScheduledMovementId?: string;
  postExpectedMovementId?: string;
  currencyCode?: string;
  movementAccountContext?: {
    name: string;
    type?: Exclude<ComposerMode, 'picker'>;
  };
  expenseItemNameError?: string;
  expenseItemAmountError?: string;
  expenseSplitError?: string;
  amountError?: string;
  transferAmountInError?: string;
  transferFxRateError?: string;
  dateError?: string;
  recurrenceIntervalError?: string;
  recurrenceEndDateError?: string;
  recurrenceEndCountError?: string;
  expectedConflictError?: string;
};

export type TransactionComposerViewProvided = {
  onOpen: () => void;
  onClose: () => void;
  onCollapse?: () => void;
  onSelectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
  onSelectSourceAccount: (accountId: string) => void;
  onToggleAdvanced: () => void;
  onSetAmount: (value: string) => void;
  onSetDate: (value: string) => void;
  onSetNote: (value: string) => void;
  onSetCategoryId: (value: string) => void;
  onSetTagInput: (value: string) => void;
  onSelectTag: (tagId: string) => void;
  onCreateTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
  onRemoveLastTag: () => void;
  onSetTransferTarget: (value: string) => void;
  onSetTransferAmountIn: (value: string) => void;
  onSetTransferFxRate: (value: string) => void;
  onSetTransferFxMode: (value: 'auto_destination' | 'auto_rate') => void;
  onToggleExpenseDetailed: () => void;
  onOpenSplitEditor: () => void;
  onCloseSplitEditor: () => void;
  onApplySplit: () => void;
  onRemoveSplit: () => void;
  onSetExpenseItemName: (value: string) => void;
  onSetExpenseItemAmount: (value: string) => void;
  onStartExpenseItem: () => void;
  onCancelExpenseItem: () => void;
  onAddExpenseItem: () => boolean;
  onEditExpenseItem: (itemId: string) => void;
  onRemoveExpenseItem: (itemId: string) => void;
  onSplitByParts: (amount: string, parts: string, addedPersonName?: string) => void;
  onSplitByWeightedParts: (amount: string, parts: Array<{ id?: string; name: string; parts: number }>) => void;
  onSelectSplitMode: (mode: 'items' | 'parts') => void;
  onSetSchedulingMode: (value: 'now' | 'scheduled') => void;
  onSetSchedulingKind: (value: 'one_shot' | 'recurring') => void;
  onOpenRecurringScheduleEditor: () => void;
  onApplyRecurringSchedule: () => void;
  onCloseRecurringScheduleEditor: () => void;
  onRemoveRecurringSchedule: () => void;
  onSetRecurrenceFrequency: (value: RecurrenceFrequency) => void;
  onSetRecurrenceInterval: (value: string) => void;
  onSetRecurrenceWeeklyDay: (value: string) => void;
  onSetRecurrenceMonthlyPattern: (value: RecurrenceMonthlyPattern) => void;
  onSetRecurrenceDayOfMonth: (value: string) => void;
  onSetRecurrenceMonthlyOrdinal: (value: string) => void;
  onSetRecurrenceMonthlyWeekday: (value: string) => void;
  onSetRecurrenceEndKind: (value: RecurrenceEndInput['kind']) => void;
  onSetRecurrenceEndDate: (value: string) => void;
  onSetRecurrenceEndCount: (value: string) => void;
  onSetExpected: (value: boolean) => void;
  onSubmit: (event: FormEvent) => Promise<void> | void;
};

type Props = {
  required: TransactionComposerViewRequired;
  provided: TransactionComposerViewProvided;
};

function todayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function recurrenceSummary(
  frequency: RecurrenceFrequency,
  interval: string,
  monthlyPattern: RecurrenceMonthlyPattern,
  dayOfMonth: string,
): string {
  const normalizedInterval = interval.trim() || '1';
  if (frequency === 'monthly' && monthlyPattern === 'day_of_month') {
    return normalizedInterval === '1'
      ? `Monthly · day ${dayOfMonth || '1'}`
      : `Monthly · every ${normalizedInterval} months · day ${dayOfMonth || '1'}`;
  }
  if (normalizedInterval === '1') {
    return titleCase(frequency);
  }
  return `${titleCase(frequency)} · every ${normalizedInterval}`;
}

const COMPOSER_MODES: Array<{ value: Exclude<ComposerMode, 'picker'>; label: string; iconClassName: string }> = [
  { value: 'expense', label: 'Expense', iconClassName: 'bi bi-person-fill-down' },
  { value: 'income', label: 'Income', iconClassName: 'bi bi-arrow-up-right' },
  { value: 'transfer', label: 'Transfer', iconClassName: 'bi bi-arrow-left-right' },
];

export function TransactionComposerView({ required, provided }: Props) {
  const {
    open,
    mode,
    disabled,
    amount,
    date,
    nextScheduledOccurrenceDate,
    note,
    categoryId,
    categoryOptions,
    tagInput,
    selectedTagOptions,
    tagSuggestions,
    tagCreateCandidate,
    transferTargetAccountId,
    transferTargetOptions,
    transferAmountIn,
    transferFxRate,
    transferFxMode,
    transferDestinationCurrency,
    transferCrossCurrency,
    expenseDetailed,
    splitEditorOpen,
    splitApplied,
    splitDraftMode,
    expenseItems,
    expenseItemOptions,
    expenseItemName,
    expenseItemAmount,
    editingExpenseItemId,
    expenseSplitTotal,
    expenseSplitRemaining,
    schedulingMode,
    schedulingKind,
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceWeeklyDay,
    recurrenceMonthlyPattern,
    recurrenceDayOfMonth,
    recurrenceMonthlyOrdinal,
    recurrenceMonthlyWeekday,
    recurrenceEndKind,
    recurrenceEndDate,
    recurrenceEndCount,
    scheduleEditorOpen,
    expected,
    editedScheduledMovementId,
    postExpectedMovementId,
    currencyCode,
    expenseItemNameError,
    expenseItemAmountError,
    expenseSplitError,
    amountError,
    transferAmountInError,
    transferFxRateError,
    dateError,
    recurrenceIntervalError,
    recurrenceEndDateError,
    recurrenceEndCountError,
    expectedConflictError,
  } = required;
  const {
    onClose,
    onCollapse,
    onSelectMode,
    onSelectSourceAccount,
    onSetAmount,
    onSetDate,
    onSetNote,
    onSetCategoryId,
    onSetTagInput,
    onSelectTag,
    onCreateTag,
    onRemoveTag,
    onRemoveLastTag,
    onSetTransferTarget,
    onSetTransferAmountIn,
    onSetTransferFxRate,
    onSetTransferFxMode,
    onToggleExpenseDetailed,
    onOpenSplitEditor,
    onCloseSplitEditor,
    onApplySplit,
    onRemoveSplit,
    onSetExpenseItemName,
    onSetExpenseItemAmount,
    onStartExpenseItem,
    onCancelExpenseItem,
    onAddExpenseItem,
    onEditExpenseItem,
    onRemoveExpenseItem,
    onSplitByParts,
    onSplitByWeightedParts,
    onSelectSplitMode,
    onOpenRecurringScheduleEditor,
    onApplyRecurringSchedule,
    onCloseRecurringScheduleEditor,
    onRemoveRecurringSchedule,
    onSetRecurrenceFrequency,
    onSetRecurrenceInterval,
    onSetRecurrenceWeeklyDay,
    onSetRecurrenceMonthlyPattern,
    onSetRecurrenceDayOfMonth,
    onSetRecurrenceMonthlyOrdinal,
    onSetRecurrenceMonthlyWeekday,
    onSetRecurrenceEndKind,
    onSetRecurrenceEndDate,
    onSetRecurrenceEndCount,
    onSubmit,
  } = provided;
  const [shareEditorOpen, setShareEditorOpen] = useState(false);
  const [shareSummary, setShareSummary] = useState<{ peopleCount: number; total: string } | null>(null);

  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open && mode !== 'picker') {
      const timer = window.setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 20);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, mode]);

  const editingScheduledMovement = Boolean(editedScheduledMovementId);
  const expectedAvailable = (mode === 'expense' || mode === 'income') && !editingScheduledMovement;
  const postExpectedMovement = Boolean(postExpectedMovementId);
  const amountLabel = mode === 'transfer'
    ? `Amount out${currencyCode ? ` (${currencyCode})` : ''}`
    : expected
      ? `Estimated amount${currencyCode ? ` (${currencyCode})` : ''}`
      : `Amount${currencyCode ? ` (${currencyCode})` : ''}`;

  const amountInLabel = `Amount in${transferDestinationCurrency ? ` (${transferDestinationCurrency})` : ''}`;
  const fxLabel = `FX rate${transferDestinationCurrency && currencyCode ? ` (${transferDestinationCurrency}/${currencyCode})` : ''}`;
  const datePlaceholder = todayIsoLocal();
  const repeatEnabled = (mode === 'expense' || mode === 'income')
    && schedulingMode === 'scheduled'
    && schedulingKind === 'recurring';
  const recurringScheduleAvailable = mode === 'expense' || mode === 'income';
  const recurringScheduleConfigured = recurringScheduleAvailable && repeatEnabled;
  const splitAvailable = mode === 'expense' || mode === 'income';
  const shareAvailable = mode === 'expense';
  const shareEnabled = Number(amount) > 0;
  const visibleShareSummary = shareEnabled ? shareSummary : null;
  const amountLocked = splitApplied || Boolean(visibleShareSummary);
  const frequentCategoryIds = mode === 'income'
    ? FREQUENT_INCOME_CATEGORY_IDS
    : FREQUENT_EXPENSE_CATEGORY_IDS;
  const transferScheduleAvailable = mode === 'transfer';
  const transferScheduleConfigured = transferScheduleAvailable && schedulingMode === 'scheduled';
  const scheduleControlsDate = recurringScheduleConfigured || transferScheduleConfigured;
  const scheduleEditorTitle = transferScheduleAvailable ? 'Schedule rule' : 'Recurring schedule';
  const dateInputLabel = recurringScheduleConfigured
    ? 'Next execution date'
    : expected
    ? 'Expected date'
    : mode === 'expense'
      ? 'Date'
      : transferScheduleConfigured
        ? 'Execution date'
        : 'Date';
  const scheduleSummary = recurrenceSummary(
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceMonthlyPattern,
    recurrenceDayOfMonth,
  );

  const splitReady = useMemo(() => {
    if (splitEditorOpen) {
      return false;
    }
    if ((mode !== 'expense' && mode !== 'income') || !expenseDetailed) {
      return true;
    }
    return expenseItems.length > 0;
  }, [expenseDetailed, expenseItems.length, mode, splitEditorOpen]);
  const splitControl = splitAvailable
    ? splitApplied
      ? (
        <SplitSummaryView
          required={{
            config: {},
            data: {},
            state: {
              itemsCount: expenseItems.length,
              total: expenseSplitTotal,
              currencyCode,
            },
            status: { disabled },
          }}
          provided={{
            commands: {
              edit: onOpenSplitEditor,
              remove: onRemoveSplit,
            },
          }}
        />
      )
      : (
        <SplitTriggerView
          required={{
            config: {},
            data: {},
            state: {},
            status: { disabled },
          }}
          provided={{ commands: { open: onOpenSplitEditor } }}
        />
      )
    : null;
  const shareControl = shareAvailable ? (
    <ShareControlsView
      required={{
        config: {},
        data: {},
        state: {
          applied: Boolean(visibleShareSummary),
          peopleCount: visibleShareSummary?.peopleCount ?? 0,
          total: visibleShareSummary?.total ?? amount,
          currencyCode,
        },
        status: { disabled: disabled || !shareEnabled },
      }}
      provided={{
        commands: {
          open: () => setShareEditorOpen(true),
          remove: () => setShareSummary(null),
        },
      }}
    />
  ) : null;
  const amountAccessory = splitControl || shareControl ? (
    <div className="composer-amount-accessory">
      <div className="composer-details-title">Details</div>
      <div className="composer-details-chips">
        {shareControl}
        {splitControl}
      </div>
    </div>
  ) : null;

  if (!open) {
    return null;
  }
  const selectedMode: Exclude<ComposerMode, 'picker'> = mode === 'picker' ? 'expense' : mode;

  return (
    <>
      <SheetView
        required={{
          config: {
            ariaLabel: 'Transaction composer',
            panelClassName: 'composer-sheet',
            showHandle: true,
            dragToClose: !onCollapse,
            dragDownToCollapse: Boolean(onCollapse),
            dragSurface: onCollapse ? 'panel' : 'handle',
          },
          data: {
            body: (
            <form className="composer-form" onSubmit={onSubmit} aria-busy={disabled} noValidate>
            <div className="composer-form-content stack">
              <div className="composer-context-controls">
                <label className={`composer-context-select composer-context-select--${selectedMode}`}>
                  <i className={COMPOSER_MODES.find((item) => item.value === selectedMode)?.iconClassName ?? 'bi bi-arrow-down-left'} aria-hidden />
                  <select
                    aria-label="Movement type"
                    value={selectedMode}
                    disabled={disabled}
                    onChange={(event) => onSelectMode(event.target.value as Exclude<ComposerMode, 'picker'>)}
                  >
                    {COMPOSER_MODES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down" aria-hidden />
                </label>
                <label className="composer-context-select composer-context-select--account">
                  <i className="bi bi-wallet2" aria-hidden />
                  <select
                    aria-label="Source account"
                    value={required.sourceAccountId}
                    disabled={disabled}
                    onChange={(event) => onSelectSourceAccount(event.target.value)}
                  >
                    {required.sourceAccountOptions.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down" aria-hidden />
                </label>
              </div>
              <TransactionMainFieldsView
                required={{
                  config: {
                    amountLabel,
                    dateInputLabel,
                    datePlaceholder,
                    noteLabel: mode === 'transfer' ? 'Description' : mode === 'expense' ? 'Merchant' : 'Source',
                    notePlaceholder: mode === 'transfer' ? 'Description' : mode === 'expense' ? 'Cafe' : 'Salary',
                    amountInputRef,
                    dateInputRef,
                  },
                  data: {
                    transferTargetOptions,
                  },
                  state: {
                    mode: selectedMode,
                    amount,
                    date,
                    note,
                    transferTargetAccountId,
                  },
                  status: {
                    disabled,
                    amountDisabled: amountLocked,
                    dateDisabled: recurringScheduleConfigured,
                    dateVisible: !scheduleControlsDate,
                    amountError,
                    dateError,
                  },
                }}
                provided={{
                  commands: {
                    changeAmount: onSetAmount,
                    changeDate: onSetDate,
                    changeNote: onSetNote,
                    changeTransferTarget: onSetTransferTarget,
                  },
                }}
              />

              {recurringScheduleAvailable ? (
                recurringScheduleConfigured ? (
                  <ScheduleSummaryView
                    required={{
                      config: {},
                      data: {},
                      state: {
                        summary: scheduleSummary,
                        nextDate: nextScheduledOccurrenceDate ?? date,
                      },
                      status: { disabled },
                    }}
                    provided={{
                      commands: {
                        edit: onOpenRecurringScheduleEditor,
                        remove: onRemoveRecurringSchedule,
                      },
                    }}
                  />
                ) : (
                  <ScheduleTriggerView
                    required={{
                      config: {},
                      data: {},
                      state: {},
                      status: { disabled },
                    }}
                    provided={{ commands: { open: onOpenRecurringScheduleEditor } }}
                  />
                )
              ) : null}

              {transferScheduleAvailable ? (
                transferScheduleConfigured ? (
                  <ScheduleSummaryView
                    required={{
                      config: {},
                      data: {},
                      state: {
                        summary: scheduleSummary,
                        nextDate: nextScheduledOccurrenceDate ?? date,
                      },
                      status: { disabled },
                    }}
                    provided={{
                      commands: {
                        edit: onOpenRecurringScheduleEditor,
                        remove: onRemoveRecurringSchedule,
                      },
                    }}
                  />
                ) : (
                  <ScheduleTriggerView
                    required={{
                      config: { label: 'Schedule' },
                      data: {},
                      state: {},
                      status: { disabled },
                    }}
                    provided={{ commands: { open: onOpenRecurringScheduleEditor } }}
                  />
                )
              ) : null}

              {mode === 'transfer' && transferCrossCurrency ? (
                <TransferFxFieldsView
                  required={{
                    config: {
                      amountInLabel,
                      fxLabel,
                    },
                    data: {},
                    state: {
                      amountIn: transferAmountIn,
                      fxRate: transferFxRate,
                      fxMode: transferFxMode,
                    },
                    status: {
                      disabled,
                      amountInError: transferAmountInError,
                      fxRateError: transferFxRateError,
                    },
                  }}
                  provided={{
                    commands: {
                      changeAmountIn: onSetTransferAmountIn,
                      changeFxRate: onSetTransferFxRate,
                      changeFxMode: onSetTransferFxMode,
                    },
                  }}
                />
              ) : null}

              <div className="stack composer-advanced">
                {mode === 'expense' || mode === 'income' ? (
                  <>
                    <CategoryPickerField
                      required={{
                        selectedCategoryId: categoryId,
                        options: categoryOptions,
                        frequentCategoryIds,
                        disabled,
                      }}
                      provided={{
                        onSelect: onSetCategoryId,
                      }}
                    />

                    <MultiTagPickerView
                      required={{
                        config: { label: 'Tags', placeholder: 'Add tag...' },
                        data: {
                          selectedTags: selectedTagOptions,
                          suggestions: tagSuggestions,
                        },
                        state: {
                          query: tagInput,
                          createCandidate: tagCreateCandidate,
                        },
                        status: { disabled },
                      }}
                      provided={{
                        commands: {
                          changeQuery: onSetTagInput,
                          selectTag: onSelectTag,
                          createTag: onCreateTag,
                          removeTag: onRemoveTag,
                          removeLastTag: onRemoveLastTag,
                        },
                      }}
                    />

                    {expectedConflictError ? <p className="field-error">{expectedConflictError}</p> : null}

                  </>
                ) : (
                  <>
                    <MultiTagPickerView
                      required={{
                        config: { label: 'Tags', placeholder: 'Add tag...' },
                        data: {
                          selectedTags: selectedTagOptions,
                          suggestions: tagSuggestions,
                        },
                        state: {
                          query: tagInput,
                          createCandidate: tagCreateCandidate,
                        },
                        status: { disabled },
                      }}
                      provided={{
                        commands: {
                          changeQuery: onSetTagInput,
                          selectTag: onSelectTag,
                          createTag: onCreateTag,
                          removeTag: onRemoveTag,
                          removeLastTag: onRemoveLastTag,
                        },
                      }}
                    />
                  </>
                )}
              </div>
              {amountAccessory}
            </div>

            <TransactionComposerActionsView
              required={{
                config: {},
                data: {},
                state: {
                  splitReady,
                  expectedAvailable,
                  expected,
                  editingScheduledMovement,
                  postExpectedMovement,
                },
                status: { disabled },
              }}
              provided={{ commands: {} }}
            />
            </form>
          ),
          },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: onClose, collapse: onCollapse } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: scheduleEditorTitle,
            panelClassName: 'composer-sheet composer-schedule-sheet',
          },
          data: {
            body: (
              <RecurrenceEditorView
                required={{
                  config: { title: scheduleEditorTitle },
                  data: {},
                  state: {
                    frequency: recurrenceFrequency,
                    interval: recurrenceInterval,
                    weeklyDay: recurrenceWeeklyDay,
                    monthlyPattern: recurrenceMonthlyPattern,
                    dayOfMonth: recurrenceDayOfMonth,
                    monthlyOrdinal: recurrenceMonthlyOrdinal,
                    monthlyWeekday: recurrenceMonthlyWeekday,
                    endKind: recurrenceEndKind,
                    endDate: recurrenceEndDate,
                    endCount: recurrenceEndCount,
                    nextOccurrenceDate: nextScheduledOccurrenceDate ?? date,
                  },
                  status: {
                    intervalError: recurrenceIntervalError,
                    endDateError: recurrenceEndDateError,
                    endCountError: recurrenceEndCountError,
                  },
                }}
                provided={{
                  commands: {
                    closeEditor: onCloseRecurringScheduleEditor,
                    applySchedule: onApplyRecurringSchedule,
                    setFrequency: onSetRecurrenceFrequency,
                    setInterval: onSetRecurrenceInterval,
                    setWeeklyDay: onSetRecurrenceWeeklyDay,
                    setMonthlyPattern: onSetRecurrenceMonthlyPattern,
                    setDayOfMonth: onSetRecurrenceDayOfMonth,
                    setMonthlyOrdinal: onSetRecurrenceMonthlyOrdinal,
                    setMonthlyWeekday: onSetRecurrenceMonthlyWeekday,
                    setEndKind: onSetRecurrenceEndKind,
                    setEndDate: onSetRecurrenceEndDate,
                    setEndCount: onSetRecurrenceEndCount,
                  },
                }}
              />
            ),
          },
          state: { open: scheduleEditorOpen },
          status: { disabled },
        }}
        provided={{ commands: { close: onCloseRecurringScheduleEditor } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Split amount',
            title: 'Split amount',
            closeLabel: 'Close split amount',
            panelClassName: 'composer-sheet composer-split-sheet',
            contentClassName: 'composer-split-content',
          },
          data: {
            body: (
              <div className="stack composer-split-editor">
                <ExpenseSplitEditorView
                  required={{
                    config: {},
                    data: { items: expenseItems, itemOptions: expenseItemOptions },
                    state: {
                      enabled: true,
                      itemName: expenseItemName,
                      itemAmount: expenseItemAmount,
                      editingItemId: editingExpenseItemId,
                      splitMode: splitDraftMode,
                      splitTotal: expenseSplitTotal,
                      splitBaseAmount: amount,
                      splitRemaining: expenseSplitRemaining,
                      currencyCode,
                      itemNameError: expenseItemNameError,
                      itemAmountError: expenseItemAmountError,
                      splitError: expenseSplitError,
                    },
                    status: { disabled, hideToggle: true },
                  }}
                  provided={{
                    commands: {
                      toggleEnabled: onToggleExpenseDetailed,
                      changeItemName: onSetExpenseItemName,
                      changeItemAmount: onSetExpenseItemAmount,
                      startItem: onStartExpenseItem,
                      cancelItem: onCancelExpenseItem,
                      addItem: onAddExpenseItem,
                      editItem: onEditExpenseItem,
                      removeItem: onRemoveExpenseItem,
                      splitByParts: onSplitByParts,
                      splitByWeightedParts: onSplitByWeightedParts,
                      selectMode: onSelectSplitMode,
                    },
                  }}
                />
                <button
                  type="button"
                  className="primary-button composer-split-apply"
                  onClick={onApplySplit}
                  disabled={disabled}
                >
                  Apply split
                </button>
              </div>
            ),
          },
          state: { open: splitEditorOpen },
          status: { disabled },
        }}
        provided={{ commands: { close: onCloseSplitEditor } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Share expense',
            title: 'Share expense',
            closeLabel: 'Close share expense',
            panelClassName: 'composer-sheet composer-share-sheet',
            contentClassName: 'composer-share-content',
          },
          data: {
            body: (
              <ShareExpenseEditorView
                required={{
                  config: {},
                  data: {},
                  state: {
                    amount,
                    currencyCode,
                  },
                  status: { disabled },
                }}
                provided={{
                  commands: {
                    applyShare: (summary) => {
                      setShareSummary(summary);
                      setShareEditorOpen(false);
                    },
                  },
                }}
              />
            ),
          },
          state: { open: shareEnabled && shareEditorOpen },
          status: { disabled },
        }}
        provided={{ commands: { close: () => setShareEditorOpen(false) } }}
      />
    </>
  );
}
