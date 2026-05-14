import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { SheetView } from '../../shared/ui/SheetView';
import { CategoryComboboxField } from './CategoryComboboxField';
import { ComposerModePickerView } from './ComposerModePickerView';
import { ExpenseSplitEditorView } from './ExpenseSplitEditorView';
import { RecurrenceEditorView } from './RecurrenceEditorView';
import { SchedulingOptionsView } from './SchedulingOptionsView';
import { TagComboboxField } from './TagComboboxField';
import { TransferFxFieldsView } from './TransferFxFieldsView';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../shared/domain/schedulingView.types';

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
  note: string;
  categoryInput: string;
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
  expenseItems: ComposerExpenseItem[];
  expenseItemName: string;
  expenseItemAmount: string;
  expenseRemaining: string;
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
    editedScheduledMovementId?: string;
    postExpectedMovementId?: string;
    currencyCode?: string;
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
  onSetCategoryInput: (value: string) => void;
  onSetTagInput: (value: string) => void;
  onSetTransferTarget: (value: string) => void;
  onSetTransferAmountIn: (value: string) => void;
  onSetTransferFxRate: (value: string) => void;
  onSetTransferFxMode: (value: 'auto_destination' | 'auto_rate') => void;
  onToggleExpenseDetailed: () => void;
  onSetExpenseItemName: (value: string) => void;
  onSetExpenseItemAmount: (value: string) => void;
  onAddExpenseItem: () => void;
  onEditExpenseItem: (itemId: string) => void;
  onRemoveExpenseItem: (itemId: string) => void;
  onAssignRemaining: () => void;
  onSetSchedulingMode: (value: 'now' | 'scheduled') => void;
  onSetSchedulingKind: (value: 'one_shot' | 'recurring') => void;
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

function titleForMode(mode: ComposerMode): string {
  if (mode === 'expense') return 'New expense';
  if (mode === 'income') return 'New income';
  if (mode === 'transfer') return 'New transfer';
  return 'Add movement';
}

function titleForModeAndPurpose(
  mode: ComposerMode,
  postExpectedMovementId?: string,
  editedScheduledMovementId?: string,
): string {
  if (postExpectedMovementId) {
    if (mode === 'expense') return 'Post expense';
    if (mode === 'income') return 'Post income';
  }
  if (editedScheduledMovementId) {
    if (mode === 'expense') return 'Edit scheduled expense';
    if (mode === 'income') return 'Edit scheduled income';
    return 'Edit scheduled movement';
  }
  return titleForMode(mode);
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function todayIsoLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionComposerView({ required, provided }: Props) {
  const {
    open,
    mode,
    disabled,
    amount,
    date,
    note,
    categoryInput,
    categoryOptions,
    tagInput,
    tagOptions,
    advancedOpen,
    transferTargetAccountId,
    transferTargetOptions,
    transferAmountIn,
    transferFxRate,
    transferFxMode,
    transferDestinationCurrency,
    transferCrossCurrency,
    expenseDetailed,
    expenseItems,
    expenseItemName,
    expenseItemAmount,
    expenseRemaining,
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
    onOpen,
    onClose,
    onSelectMode,
    onToggleAdvanced,
    onSetAmount,
    onSetDate,
    onSetNote,
    onSetCategoryInput,
    onSetTagInput,
    onSetTransferTarget,
    onSetTransferAmountIn,
    onSetTransferFxRate,
    onSetTransferFxMode,
    onToggleExpenseDetailed,
    onSetExpenseItemName,
    onSetExpenseItemAmount,
    onAddExpenseItem,
    onEditExpenseItem,
    onRemoveExpenseItem,
    onAssignRemaining,
    onSetSchedulingMode,
    onSetSchedulingKind,
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
    onSetExpected,
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
  const scheduledMovementVisible = mode !== 'expense' && schedulingMode === 'scheduled';
  const recurringMovementVisible = scheduledMovementVisible && schedulingKind === 'recurring';
  const dateInputLabel = expected
    ? 'Expected date'
    : mode === 'expense'
      ? 'Date'
    : recurringMovementVisible
      ? 'First execution date'
      : scheduledMovementVisible
        ? 'Execution date'
        : 'Date';

  const splitReady = useMemo(() => {
    if ((mode !== 'expense' && mode !== 'income') || !expenseDetailed) {
      return true;
    }
    return expenseItems.length > 0 && Number(expenseRemaining) === 0;
  }, [expenseDetailed, expenseItems.length, expenseRemaining, mode]);

  if (!open) {
    return (
      <button type="button" className="fab-button" onClick={onOpen} aria-label="Add movement">
        <i className="bi bi-plus-lg" aria-hidden /> Movement
      </button>
    );
  }

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Transaction composer',
          title: titleForModeAndPurpose(mode, postExpectedMovementId, editedScheduledMovementId),
          closeLabel: 'Close transaction composer',
          panelClassName: 'composer-sheet',
        },
        data: {
          body: mode === 'picker' ? (
            <ComposerModePickerView
              required={{
                config: {},
                data: {},
                state: {},
                status: { disabled },
              }}
              provided={{ commands: { selectMode: onSelectMode } }}
            />
          ) : (
          <form className="composer-form" onSubmit={onSubmit} aria-busy={disabled} noValidate>
            <div className="composer-form-content stack">
              {mode !== 'transfer' ? (
                <>
                  <label className="stack">
                    <span className="visually-hidden">{amountLabel}</span>
                    <input
                      ref={amountInputRef}
                      aria-label="Amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      placeholder="Amount"
                      onChange={(event) => onSetAmount(event.target.value)}
                      inputMode="decimal"
                      aria-invalid={Boolean(amountError)}
                      aria-describedby={amountError ? 'composer-amount-error' : undefined}
                    />
                  </label>
                  {amountError ? <p id="composer-amount-error" className="field-error">{amountError}</p> : null}
                </>
              ) : null}

              {mode === 'transfer' ? (
                <label className="stack">
                  <span className="visually-hidden">Destination account</span>
                  <select
                    aria-label="Destination account"
                    value={transferTargetAccountId}
                    onChange={(event) => onSetTransferTarget(event.target.value)}
                  >
                    <option value="">Select account</option>
                    {transferTargetOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {mode === 'transfer' ? (
                <>
                  <label className="stack">
                    <span className="visually-hidden">{amountLabel}</span>
                    <input
                      ref={amountInputRef}
                      aria-label="Amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      placeholder="Amount"
                      onChange={(event) => onSetAmount(event.target.value)}
                      inputMode="decimal"
                      aria-invalid={Boolean(amountError)}
                      aria-describedby={amountError ? 'composer-amount-error' : undefined}
                    />
                  </label>
                  {amountError ? <p id="composer-amount-error" className="field-error">{amountError}</p> : null}

                  <label className="stack">
                    <span className="visually-hidden">Description</span>
                    <input
                      aria-label="Description"
                      value={note}
                      onChange={(event) => onSetNote(event.target.value)}
                      placeholder="Description"
                    />
                  </label>
                </>
              ) : null}

              {mode !== 'transfer' ? (
                <label className="stack">
                  <span className="visually-hidden">{mode === 'expense' ? 'Merchant' : 'Source'}</span>
                  <input
                    aria-label={mode === 'expense' ? 'Merchant' : 'Source'}
                    value={note}
                    onChange={(event) => onSetNote(event.target.value)}
                    placeholder={mode === 'expense' ? 'Cafe' : 'Salary'}
                  />
                </label>
              ) : null}

              <div className="date-input-row">
                <label className="stack date-input-field">
                  <span className="visually-hidden">{dateInputLabel}</span>
                  <input
                    aria-label={dateInputLabel}
                    type="text"
                    value={date}
                    placeholder={datePlaceholder}
                    inputMode="numeric"
                    onFocus={() => {
                      if (date === datePlaceholder) {
                        onSetDate('');
                      }
                    }}
                    onChange={(event) => onSetDate(formatDateInput(event.target.value))}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? 'composer-date-error' : undefined}
                  />
                  <input
                    ref={dateInputRef}
                    className="visually-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    type="date"
                    value={date}
                    onChange={(event) => onSetDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="text-button icon-button date-picker-button"
                  aria-label="Open calendar"
                  onClick={() => {
                    dateInputRef.current?.showPicker?.();
                  }}
                  disabled={disabled}
                >
                  <i className="bi bi-calendar3" aria-hidden />
                </button>
              </div>
              {dateError ? <p id="composer-date-error" className="field-error">{dateError}</p> : null}

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

              <button
                type="button"
                className="composer-more-options"
                onClick={onToggleAdvanced}
                aria-expanded={advancedOpen}
                aria-controls="composer-advanced-options"
              >
                <span>More options</span>
                <i
                  className={advancedOpen ? 'bi bi-chevron-up composer-more-options-caret' : 'bi bi-chevron-down composer-more-options-caret'}
                  aria-hidden
                />
              </button>

              {advancedOpen ? (
                <div id="composer-advanced-options" className="stack composer-advanced">
                  {mode === 'expense' || mode === 'income' ? (
                    <>
                      <CategoryComboboxField
                        required={{
                          value: categoryInput,
                          options: categoryOptions,
                          disabled,
                        }}
                        provided={{
                          onChange: onSetCategoryInput,
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

                      <label className="inline-checkbox">
                        <input
                          type="checkbox"
                          checked={expected}
                          onChange={() => onSetExpected(!expected)}
                          disabled={disabled || editingScheduledMovement}
                        />
                        Expected
                      </label>
                      {expectedConflictError ? <p className="field-error">{expectedConflictError}</p> : null}

                      <label className="inline-checkbox">
                        <input
                          type="checkbox"
                          checked={repeatEnabled}
                          onChange={() => {
                            if (repeatEnabled) {
                              onSetSchedulingKind('one_shot');
                              onSetSchedulingMode('now');
                              return;
                            }
                            onSetSchedulingMode('scheduled');
                            onSetSchedulingKind('recurring');
                          }}
                          disabled={disabled}
                        />
                        {mode === 'expense' ? 'Repeat this expense' : 'Repeat this income'}
                      </label>
                      {expected ? <p className="hint">Expected movements stay out of ledger balance until posted.</p> : null}

                      {repeatEnabled ? (
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
                      ) : null}

                      <ExpenseSplitEditorView
                        required={{
                          config: {},
                          data: { items: expenseItems },
                          state: {
                            enabled: expenseDetailed,
                            itemName: expenseItemName,
                            itemAmount: expenseItemAmount,
                            remaining: expenseRemaining,
                            currencyCode,
                            itemNameError: expenseItemNameError,
                            itemAmountError: expenseItemAmountError,
                            splitError: expenseSplitError,
                          },
                          status: { disabled },
                        }}
                        provided={{
                          commands: {
                            toggleEnabled: onToggleExpenseDetailed,
                            changeItemName: onSetExpenseItemName,
                            changeItemAmount: onSetExpenseItemAmount,
                            addItem: onAddExpenseItem,
                            assignRemaining: onAssignRemaining,
                            editItem: onEditExpenseItem,
                            removeItem: onRemoveExpenseItem,
                          },
                        }}
                      />
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
              ) : null}
            </div>

            <div className="composer-actions">
              <button type="submit" className="primary-cta" disabled={disabled || !splitReady}>
                {postExpectedMovement
                  ? 'Post movement'
                  : editingScheduledMovement
                    ? 'Update scheduled'
                    : expectedAvailable && expected
                      ? 'Save expected'
                      : 'Save'}
              </button>
            </div>
          </form>
        ),
        },
        state: { open: true },
        status: {},
      }}
      provided={{ commands: { close: onClose } }}
    />
  );
}
