import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import {
  FREQUENT_EXPENSE_CATEGORY_IDS,
  FREQUENT_INCOME_CATEGORY_IDS,
} from '../../../taxonomy/domain/masterCategories';
import { CategoryPickerField } from '../CategoryPickerField/CategoryPickerField';
import { ComposerModePickerView } from '../ComposerModePicker/ComposerModePickerView';
import { ExpenseSplitEditorView } from '../ExpenseSplitEditor/ExpenseSplitEditorView';
import { RecurrenceEditorView } from '../RecurrenceEditor/RecurrenceEditorView';
import { ScheduleSummaryView } from '../ScheduleControls/ScheduleSummaryView';
import { ScheduleTriggerView } from '../ScheduleControls/ScheduleTriggerView';
import { SchedulingOptionsView } from '../SchedulingOptions/SchedulingOptionsView';
import { SplitSummaryView } from '../SplitControls/SplitSummaryView';
import { SplitTriggerView } from '../SplitControls/SplitTriggerView';
import { TagComboboxField } from '../TagComboboxField';
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
  tagOptions: Array<{ id: string; name: string }>;
  advancedOpen: boolean;
  transferTargetAccountId: string;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
  transferDestinationCurrency?: string;
  transferCrossCurrency: boolean;
  expenseDetailed: boolean;
  splitEditorOpen: boolean;
  splitApplied: boolean;
  expenseItems: ComposerExpenseItem[];
  expenseItemName: string;
  expenseItemAmount: string;
  editingExpenseItemId: string;
  expenseSplitTotal: string;
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
  onSelectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
  onToggleAdvanced: () => void;
  onSetAmount: (value: string) => void;
  onSetDate: (value: string) => void;
  onSetNote: (value: string) => void;
  onSetCategoryId: (value: string) => void;
  onSetTagInput: (value: string) => void;
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
  onSplitByParts: (amount: string, parts: string) => void;
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
    tagOptions,
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
    expenseItems,
    expenseItemName,
    expenseItemAmount,
    editingExpenseItemId,
    expenseSplitTotal,
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
    movementAccountContext,
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
    onSelectMode,
    onSetAmount,
    onSetDate,
    onSetNote,
    onSetCategoryId,
    onSetTagInput,
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
    onSetSchedulingMode,
    onSetSchedulingKind,
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
      ? 'Estimated amount'
      : 'Amount';

  const amountInLabel = `Amount in${transferDestinationCurrency ? ` (${transferDestinationCurrency})` : ''}`;
  const fxLabel = `FX rate${transferDestinationCurrency && currencyCode ? ` (${transferDestinationCurrency}/${currencyCode})` : ''}`;
  const datePlaceholder = todayIsoLocal();
  const repeatEnabled = (mode === 'expense' || mode === 'income')
    && schedulingMode === 'scheduled'
    && schedulingKind === 'recurring';
  const recurringScheduleAvailable = mode === 'expense' || mode === 'income';
  const recurringScheduleConfigured = recurringScheduleAvailable && repeatEnabled;
  const splitAvailable = mode === 'expense' || mode === 'income';
  const frequentCategoryIds = mode === 'income'
    ? FREQUENT_INCOME_CATEGORY_IDS
    : FREQUENT_EXPENSE_CATEGORY_IDS;
  const scheduledMovementVisible = mode !== 'expense' && schedulingMode === 'scheduled';
  const dateInputLabel = recurringScheduleConfigured
    ? 'Next execution date'
    : expected
    ? 'Expected date'
    : mode === 'expense'
      ? 'Date'
      : scheduledMovementVisible
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

  if (!open) {
    return null;
  }

  return (
    <>
      <SheetView
        required={{
          config: {
            ariaLabel: 'Transaction composer',
            panelClassName: 'composer-sheet',
            showHandle: true,
            dragToClose: true,
          },
          data: {
            body: mode === 'picker' ? (
              <div className="composer-form-content stack">
                {movementAccountContext?.name ? (
                  <div className="composer-account-context">
                    <span>Movement for</span>
                    <strong>{movementAccountContext.name}</strong>
                  </div>
                ) : null}
                <ComposerModePickerView
                  required={{
                    config: {},
                    data: {},
                    state: {},
                    status: { disabled },
                  }}
                  provided={{ commands: { selectMode: onSelectMode } }}
                />
              </div>
            ) : (
            <form className="composer-form" onSubmit={onSubmit} aria-busy={disabled} noValidate>
            <div className="composer-form-content stack">
              {movementAccountContext?.name ? (
                <div className="composer-account-context composer-account-context--compact">
                  <span>Movement for</span>
                  <strong>{movementAccountContext.name}</strong>
                </div>
              ) : null}
              <TransactionMainFieldsView
                required={{
                  config: {
                    amountLabel,
                    dateInputLabel,
                    datePlaceholder,
                    noteLabel: mode === 'transfer' ? 'Description' : mode === 'expense' ? 'Merchant' : 'Source',
                    notePlaceholder: mode === 'transfer' ? 'Description' : mode === 'expense' ? 'Cafe' : 'Salary',
                    afterAmount: splitControl,
                    amountInputRef,
                    dateInputRef,
                  },
                  data: {
                    transferTargetOptions,
                  },
                  state: {
                    mode,
                    amount,
                    date,
                    note,
                    transferTargetAccountId,
                  },
                  status: {
                    disabled,
                    amountVisible: !splitApplied,
                    dateDisabled: recurringScheduleConfigured,
                    dateVisible: !recurringScheduleConfigured,
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

                    <TagComboboxField
                      required={{
                        value: tagInput,
                        options: tagOptions,
                        disabled,
                      }}
                      provided={{
                        onChange: onSetTagInput,
                      }}
                    />

                    {expectedConflictError ? <p className="field-error">{expectedConflictError}</p> : null}

                  </>
                ) : (
                  <>
                    <SchedulingOptionsView
                      required={{
                        config: {},
                        data: {},
                        state: {
                          schedulingMode,
                          schedulingKind,
                          scheduledMovementVisible,
                        },
                        status: { disabled },
                      }}
                      provided={{
                        commands: {
                          setSchedulingMode: onSetSchedulingMode,
                          setSchedulingKind: onSetSchedulingKind,
                        },
                      }}
                    />

                    <TagComboboxField
                      required={{
                        value: tagInput,
                        options: tagOptions,
                        disabled,
                      }}
                      provided={{
                        onChange: onSetTagInput,
                      }}
                    />
                  </>
                )}
              </div>
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
        provided={{ commands: { close: onClose } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Recurring schedule',
            title: 'Recurring Schedule',
            closeLabel: 'Close recurring schedule',
            panelClassName: 'composer-sheet',
          },
          data: {
            body: (
              <div className="stack">
                <RecurrenceEditorView
                  required={{
                    config: {},
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
                <button
                  type="button"
                  className="primary-button"
                  onClick={onApplyRecurringSchedule}
                  disabled={disabled}
                >
                  Apply schedule
                </button>
              </div>
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
            title: 'Split Amount',
            closeLabel: 'Close split amount',
            panelClassName: 'composer-sheet',
          },
          data: {
            body: (
              <div className="stack">
                <div className="stack">
                  <span className="hint detail-meta-label">Total amount</span>
                  <strong>{expenseSplitTotal || '0.00'} {currencyCode ?? ''}</strong>
                </div>
                <ExpenseSplitEditorView
                  required={{
                    config: {},
                    data: { items: expenseItems },
                    state: {
                      enabled: true,
                      itemName: expenseItemName,
                      itemAmount: expenseItemAmount,
                      editingItemId: editingExpenseItemId,
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
                    },
                  }}
                />
                <button
                  type="button"
                  className="primary-button"
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
    </>
  );
}
