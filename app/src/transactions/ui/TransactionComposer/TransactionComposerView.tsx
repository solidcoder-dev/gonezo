import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import { MultiTagPickerView } from '../../../shared/ui/MultiTagPicker/MultiTagPickerView';
import {
  FREQUENT_EXPENSE_CATEGORY_IDS,
  FREQUENT_INCOME_CATEGORY_IDS,
} from '../../../taxonomy/domain/masterCategories';
import { CategoryPickerField } from '../CategoryPickerField/CategoryPickerField';
import { ScheduleSummaryView } from '../ScheduleControls/ScheduleSummaryView';
import { ScheduleTriggerView } from '../ScheduleControls/ScheduleTriggerView';
import { ItemBreakdownSummaryView } from '../ItemBreakdownControls/ItemBreakdownSummaryView';
import { ItemBreakdownTriggerView } from '../ItemBreakdownControls/ItemBreakdownTriggerView';
import { MovementMoreTriggerView } from '../MovementMoreControls/MovementMoreTriggerView';
import { TransactionComposerActionsView } from '../TransactionComposerActions/TransactionComposerActionsView';
import { TransactionMainFieldsView } from '../TransactionMainFields/TransactionMainFieldsView';
import { TransferFxFieldsView } from '../TransferFxFields/TransferFxFieldsView';
import { TransactionComposerChoiceSheets } from './TransactionComposerChoiceSheets';
import { TransactionComposerEditorSheets } from './TransactionComposerEditorSheets';
import { accountIconClass, COMPOSER_MODES } from './transactionComposerPresentation';
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

export type TransactionComposerShellRequired = {
  open: boolean;
  mode: ComposerMode;
  disabled: boolean;
  advancedOpen: boolean;
  expected: boolean;
  movementIgnored: boolean;
  editedScheduledMovementId?: string;
  postExpectedMovementId?: string;
  currencyCode?: string;
  movementAccountContext?: {
    name: string;
    type?: Exclude<ComposerMode, 'picker'>;
  };
};

export type TransactionComposerMainFieldsRequired = {
  amount: string;
  date: string;
  nextScheduledOccurrenceDate?: string;
  note: string;
  amountError?: string;
  dateError?: string;
};

export type TransactionComposerTaxonomyRequired = {
  categoryId: string;
  categoryOptions: Array<{ id: string; name: string }>;
  tagInput: string;
  selectedTagOptions: Array<{ id: string; name: string }>;
  tagSuggestions: Array<{ id: string; name: string }>;
  tagCreateCandidate?: string;
};

export type TransactionComposerTransferRequired = {
  transferTargetAccountId: string;
  sourceAccountId: string;
  sourceAccountOptions: Array<{ id: string; name: string; currency: string; type?: string }>;
  transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
  transferDestinationCurrency?: string;
  transferCrossCurrency: boolean;
  transferAmountInError?: string;
  transferFxRateError?: string;
};

export type TransactionComposerSplitRequired = {
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
  expenseItemNameError?: string;
  expenseItemAmountError?: string;
  expenseSplitError?: string;
};

export type TransactionComposerSchedulingRequired = {
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
  recurrenceIntervalError?: string;
  recurrenceEndDateError?: string;
  recurrenceEndCountError?: string;
  expectedConflictError?: string;
};

export type TransactionComposerSharingRequired = {
  shareEditorOpen: boolean;
  shareApplied: boolean;
  shareControl?: ReactNode;
  shareEditorBody?: ReactNode;
};

export type TransactionComposerViewRequired =
  & TransactionComposerShellRequired
  & TransactionComposerMainFieldsRequired
  & TransactionComposerTaxonomyRequired
  & TransactionComposerTransferRequired
  & TransactionComposerSplitRequired
  & TransactionComposerSchedulingRequired
  & TransactionComposerSharingRequired;

export type TransactionComposerShellProvided = {
  onOpen: () => void;
  onClose: () => void;
  onCollapse?: () => void;
  onSelectMode: (mode: Exclude<ComposerMode, 'picker'>) => void;
  onToggleAdvanced: () => void;
  onSetExpected: (value: boolean) => void;
  onSetMovementIgnored: (value: boolean) => void;
  onSubmit: (event: FormEvent) => Promise<void> | void;
};

export type TransactionComposerMainFieldsProvided = {
  onSelectSourceAccount: (accountId: string) => void;
  onSetAmount: (value: string) => void;
  onSetDate: (value: string) => void;
  onSetNote: (value: string) => void;
};

export type TransactionComposerTaxonomyProvided = {
  onSetCategoryId: (value: string) => void;
  onSetTagInput: (value: string) => void;
  onSelectTag: (tagId: string) => void;
  onCreateTag: (name: string) => void;
  onRemoveTag: (tagId: string) => void;
  onRemoveLastTag: () => void;
};

export type TransactionComposerTransferProvided = {
  onSetTransferTarget: (value: string) => void;
  onSetTransferAmountIn: (value: string) => void;
  onSetTransferFxRate: (value: string) => void;
  onSetTransferFxMode: (value: 'auto_destination' | 'auto_rate') => void;
};

export type TransactionComposerSplitProvided = {
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
};

export type TransactionComposerSchedulingProvided = {
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
};

export type TransactionComposerSharingProvided = {
  onCloseShareEditor: () => void;
};

export type TransactionComposerViewProvided =
  & TransactionComposerShellProvided
  & TransactionComposerMainFieldsProvided
  & TransactionComposerTaxonomyProvided
  & TransactionComposerTransferProvided
  & TransactionComposerSplitProvided
  & TransactionComposerSchedulingProvided
  & TransactionComposerSharingProvided;

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
    shareEditorOpen,
    shareApplied,
    movementIgnored,
    shareControl,
    shareEditorBody,
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
    onSetMovementIgnored,
    onCloseShareEditor,
    onSubmit,
  } = provided;
  const [movementTypeSheetOpen, setMovementTypeSheetOpen] = useState(false);
  const [sourceAccountSheetOpen, setSourceAccountSheetOpen] = useState(false);
  const [movementMoreOpen, setMovementMoreOpen] = useState(false);

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
  const movementMoreAvailable = mode === 'expense' || mode === 'income';
  const shareEnabled = Number(amount) > 0;
  const amountLocked = splitApplied || (shareEnabled && shareApplied);
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
        <ItemBreakdownSummaryView
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
        <ItemBreakdownTriggerView
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
  const visibleShareControl = shareAvailable ? shareControl : null;
  const movementMoreControl = movementMoreAvailable ? (
    <MovementMoreTriggerView
      required={{
        config: {},
        data: {},
        state: {},
        status: { disabled },
      }}
      provided={{ commands: { open: () => setMovementMoreOpen(true) } }}
    />
  ) : null;
  const amountAccessory = splitControl || visibleShareControl || movementMoreControl ? (
    <div className="composer-amount-accessory">
      <div className="composer-details-title">Details</div>
      <div className="composer-details-chips">
        {splitControl}
        {visibleShareControl}
        {movementMoreControl}
      </div>
    </div>
  ) : null;

  if (!open) {
    return null;
  }
  const selectedMode: Exclude<ComposerMode, 'picker'> = mode === 'picker' ? 'expense' : mode;
  const selectedModeOption = COMPOSER_MODES.find((item) => item.value === selectedMode) ?? COMPOSER_MODES[0];
  const selectedSourceAccount = required.sourceAccountOptions.find((account) => account.id === required.sourceAccountId);
  function resetLocalComposerState() {
    onCloseShareEditor();
    setMovementTypeSheetOpen(false);
    setSourceAccountSheetOpen(false);
    setMovementMoreOpen(false);
  }

  async function submitComposer(event: FormEvent) {
    await onSubmit(event);
    resetLocalComposerState();
  }

  function closeComposer() {
    resetLocalComposerState();
    onClose();
  }

  function collapseComposer() {
    resetLocalComposerState();
    onCollapse?.();
  }

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
            <form className="composer-form" onSubmit={submitComposer} aria-busy={disabled} noValidate>
            <div className="composer-form-content stack">
              <div className="composer-context-controls">
                <button
                  type="button"
                  className={`composer-context-select composer-context-select--${selectedMode}`}
                  aria-label={`Movement type ${selectedModeOption.label}`}
                  aria-haspopup="dialog"
                  disabled={disabled}
                  onClick={() => setMovementTypeSheetOpen(true)}
                >
                  <i className={selectedModeOption.iconClassName} aria-hidden />
                  <span className="composer-context-value">{selectedModeOption.label}</span>
                  <i className="bi bi-chevron-down" aria-hidden />
                </button>
                <button
                  type="button"
                  className="composer-context-select composer-context-select--account"
                  aria-label={`Source account ${selectedSourceAccount?.name ?? 'Select account'}`}
                  aria-haspopup="dialog"
                  disabled={disabled}
                  onClick={() => setSourceAccountSheetOpen(true)}
                >
                  <i className={accountIconClass(selectedSourceAccount?.type)} aria-hidden />
                  <span className="composer-context-value">{selectedSourceAccount?.name ?? 'Select account'}</span>
                  <i className="bi bi-chevron-down" aria-hidden />
                </button>
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
        provided={{ commands: { close: closeComposer, collapse: collapseComposer } }}
      />
      <TransactionComposerChoiceSheets
        required={{
          disabled,
          movementTypeSheetOpen,
          selectedMode,
          sourceAccountId: required.sourceAccountId,
          sourceAccountOptions: required.sourceAccountOptions,
          sourceAccountSheetOpen,
        }}
        provided={{
          closeMovementTypeSheet: () => setMovementTypeSheetOpen(false),
          closeSourceAccountSheet: () => setSourceAccountSheetOpen(false),
          selectMode: onSelectMode,
          selectSourceAccount: onSelectSourceAccount,
        }}
      />
      <TransactionComposerEditorSheets
        required={{
          amount,
          currencyCode,
          date,
          disabled,
          editingExpenseItemId,
          expenseItemAmount,
          expenseItemAmountError,
          expenseItemName,
          expenseItemNameError,
          expenseItemOptions,
          expenseItems,
          expenseSplitError,
          expenseSplitRemaining,
          expenseSplitTotal,
          movementIgnored,
          movementMoreOpen,
          nextScheduledOccurrenceDate,
          recurrenceDayOfMonth,
          recurrenceEndCount,
          recurrenceEndCountError,
          recurrenceEndDate,
          recurrenceEndDateError,
          recurrenceEndKind,
          recurrenceFrequency,
          recurrenceInterval,
          recurrenceIntervalError,
          recurrenceMonthlyOrdinal,
          recurrenceMonthlyPattern,
          recurrenceMonthlyWeekday,
          recurrenceWeeklyDay,
          scheduleEditorOpen,
          scheduleEditorTitle,
          shareEditorBody,
          shareEditorOpen,
          shareEnabled,
          splitDraftMode,
          splitEditorOpen,
        }}
        provided={{
          addExpenseItem: onAddExpenseItem,
          applyRecurringSchedule: onApplyRecurringSchedule,
          applySplit: onApplySplit,
          cancelExpenseItem: onCancelExpenseItem,
          closeMovementMore: () => setMovementMoreOpen(false),
          closeRecurringScheduleEditor: onCloseRecurringScheduleEditor,
          closeShareEditor: onCloseShareEditor,
          closeSplitEditor: onCloseSplitEditor,
          editExpenseItem: onEditExpenseItem,
          removeExpenseItem: onRemoveExpenseItem,
          selectSplitMode: onSelectSplitMode,
          setExpenseItemAmount: onSetExpenseItemAmount,
          setExpenseItemName: onSetExpenseItemName,
          setMovementIgnored: onSetMovementIgnored,
          setRecurrenceDayOfMonth: onSetRecurrenceDayOfMonth,
          setRecurrenceEndCount: onSetRecurrenceEndCount,
          setRecurrenceEndDate: onSetRecurrenceEndDate,
          setRecurrenceEndKind: onSetRecurrenceEndKind,
          setRecurrenceFrequency: onSetRecurrenceFrequency,
          setRecurrenceInterval: onSetRecurrenceInterval,
          setRecurrenceMonthlyOrdinal: onSetRecurrenceMonthlyOrdinal,
          setRecurrenceMonthlyPattern: onSetRecurrenceMonthlyPattern,
          setRecurrenceMonthlyWeekday: onSetRecurrenceMonthlyWeekday,
          setRecurrenceWeeklyDay: onSetRecurrenceWeeklyDay,
          splitByParts: onSplitByParts,
          splitByWeightedParts: onSplitByWeightedParts,
          startExpenseItem: onStartExpenseItem,
          toggleExpenseDetailed: onToggleExpenseDetailed,
        }}
      />
    </>
  );
}
