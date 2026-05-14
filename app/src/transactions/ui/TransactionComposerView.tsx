import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { SheetView } from '../../shared/ui/SheetView';
import { CategoryComboboxField } from './CategoryComboboxField';
import { TagComboboxField } from './TagComboboxField';
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
          <div className="stack">
            <div className="mode-row">
              <button type="button" onClick={() => onSelectMode('expense')} disabled={disabled}>
                Expense
              </button>
            </div>
            <div className="mode-row">
              <button type="button" onClick={() => onSelectMode('income')} disabled={disabled}>
                Income
              </button>
            </div>
            <div className="mode-row">
              <button type="button" onClick={() => onSelectMode('transfer')} disabled={disabled}>
                Transfer
              </button>
            </div>
          </div>
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
                <div className="stack item-editor">
                  <label className="stack">
                    <span className="visually-hidden">{amountInLabel}</span>
                    <input
                      aria-label={amountInLabel}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={transferAmountIn}
                      onChange={(event) => onSetTransferAmountIn(event.target.value)}
                      inputMode="decimal"
                      disabled={transferFxMode === 'auto_destination'}
                      aria-invalid={Boolean(transferAmountInError)}
                      aria-describedby={transferAmountInError ? 'composer-transfer-amount-in-error' : undefined}
                    />
                  </label>
                  {transferAmountInError ? <p id="composer-transfer-amount-in-error" className="field-error">{transferAmountInError}</p> : null}

                  <label className="stack">
                    <span className="visually-hidden">{fxLabel}</span>
                    <input
                      aria-label={fxLabel}
                      type="number"
                      min="0.0000001"
                      step="0.0001"
                      value={transferFxRate}
                      onChange={(event) => onSetTransferFxRate(event.target.value)}
                      inputMode="decimal"
                      disabled={transferFxMode === 'auto_rate'}
                      aria-invalid={Boolean(transferFxRateError)}
                      aria-describedby={transferFxRateError ? 'composer-transfer-fx-rate-error' : undefined}
                    />
                  </label>
                  {transferFxRateError ? <p id="composer-transfer-fx-rate-error" className="field-error">{transferFxRateError}</p> : null}

                  <div className="segmented segmented-2" role="radiogroup" aria-label="Transfer auto calculation mode">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={transferFxMode === 'auto_destination'}
                      className={transferFxMode === 'auto_destination' ? 'segment active' : 'segment'}
                      disabled={disabled}
                      onClick={() => onSetTransferFxMode('auto_destination')}
                    >
                      Auto amount in
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={transferFxMode === 'auto_rate'}
                      className={transferFxMode === 'auto_rate' ? 'segment active' : 'segment'}
                      disabled={disabled}
                      onClick={() => onSetTransferFxMode('auto_rate')}
                    >
                      Auto FX rate
                    </button>
                  </div>
                  <p className="hint">Edit two values; the third one is calculated automatically.</p>
                </div>
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
                        <div className="stack item-editor composer-recurring-panel">
                          <div className="composer-recurring-row">
                            <span>Frequency</span>
                            <select
                              aria-label="Recurrence frequency"
                              value={recurrenceFrequency}
                              onChange={(event) => onSetRecurrenceFrequency(event.target.value as RecurrenceFrequency)}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>

                          <div className="composer-recurring-row">
                            <span>Every</span>
                            <input
                              aria-label="Recurrence interval"
                              type="number"
                              min="1"
                              step="1"
                              value={recurrenceInterval}
                              onChange={(event) => onSetRecurrenceInterval(event.target.value)}
                              aria-invalid={Boolean(recurrenceIntervalError)}
                              aria-describedby={recurrenceIntervalError ? 'composer-recurrence-interval-error' : undefined}
                            />
                          </div>
                          {recurrenceIntervalError ? (
                            <p id="composer-recurrence-interval-error" className="field-error">{recurrenceIntervalError}</p>
                          ) : null}

                          {recurrenceFrequency === 'weekly' ? (
                            <div className="composer-recurring-row">
                              <span>Weekly rule</span>
                              <select
                                aria-label="Recurrence weekday"
                                value={recurrenceWeeklyDay}
                                onChange={(event) => onSetRecurrenceWeeklyDay(event.target.value)}
                              >
                                <option value="1">Monday</option>
                                <option value="2">Tuesday</option>
                                <option value="3">Wednesday</option>
                                <option value="4">Thursday</option>
                                <option value="5">Friday</option>
                                <option value="6">Saturday</option>
                                <option value="7">Sunday</option>
                              </select>
                            </div>
                          ) : null}

                          {recurrenceFrequency === 'monthly' ? (
                            <>
                              <div className="composer-recurring-row">
                                <span>Monthly rule</span>
                                <select
                                  aria-label="Monthly recurrence rule"
                                  value={recurrenceMonthlyPattern}
                                  onChange={(event) => onSetRecurrenceMonthlyPattern(event.target.value as RecurrenceMonthlyPattern)}
                                >
                                  <option value="day_of_month">Day of month</option>
                                  <option value="nth_weekday">Nth weekday</option>
                                </select>
                              </div>

                              {recurrenceMonthlyPattern === 'day_of_month' ? (
                                <div className="composer-recurring-row">
                                  <span>Day of month</span>
                                  <input
                                    aria-label="Monthly day of month"
                                    type="number"
                                    min="1"
                                    max="31"
                                    step="1"
                                    value={recurrenceDayOfMonth}
                                    onChange={(event) => onSetRecurrenceDayOfMonth(event.target.value)}
                                  />
                                </div>
                              ) : (
                                <div className="quick-row">
                                  <div className="composer-recurring-row">
                                    <span>Ordinal</span>
                                    <select
                                      aria-label="Monthly ordinal"
                                      value={recurrenceMonthlyOrdinal}
                                      onChange={(event) => onSetRecurrenceMonthlyOrdinal(event.target.value)}
                                    >
                                      <option value="1">1st</option>
                                      <option value="2">2nd</option>
                                      <option value="3">3rd</option>
                                      <option value="4">4th</option>
                                      <option value="5">Last-ish</option>
                                    </select>
                                  </div>
                                  <div className="composer-recurring-row">
                                    <span>Weekday</span>
                                    <select
                                      aria-label="Monthly weekday"
                                      value={recurrenceMonthlyWeekday}
                                      onChange={(event) => onSetRecurrenceMonthlyWeekday(event.target.value)}
                                    >
                                      <option value="1">Monday</option>
                                      <option value="2">Tuesday</option>
                                      <option value="3">Wednesday</option>
                                      <option value="4">Thursday</option>
                                      <option value="5">Friday</option>
                                      <option value="6">Saturday</option>
                                      <option value="7">Sunday</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}

                          <div className="composer-recurring-row">
                            <span>Ends</span>
                            <select
                              aria-label="Recurrence end"
                              value={recurrenceEndKind}
                              onChange={(event) => onSetRecurrenceEndKind(event.target.value as RecurrenceEndInput['kind'])}
                            >
                              <option value="never">Never</option>
                              <option value="on_date">On date</option>
                              <option value="after_occurrences">After count</option>
                            </select>
                          </div>

                          {recurrenceEndKind === 'on_date' ? (
                            <>
                              <div className="composer-recurring-row">
                                <span>End date</span>
                                <input
                                  aria-label="Recurrence end date"
                                  type="date"
                                  value={recurrenceEndDate}
                                  onChange={(event) => onSetRecurrenceEndDate(event.target.value)}
                                  aria-invalid={Boolean(recurrenceEndDateError)}
                                  aria-describedby={recurrenceEndDateError ? 'composer-recurrence-end-date-error' : undefined}
                                />
                              </div>
                              {recurrenceEndDateError ? (
                                <p id="composer-recurrence-end-date-error" className="field-error">{recurrenceEndDateError}</p>
                              ) : null}
                            </>
                          ) : null}

                          {recurrenceEndKind === 'after_occurrences' ? (
                            <>
                              <div className="composer-recurring-row">
                                <span>Count</span>
                                <input
                                  aria-label="Recurrence end count"
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={recurrenceEndCount}
                                  onChange={(event) => onSetRecurrenceEndCount(event.target.value)}
                                  aria-invalid={Boolean(recurrenceEndCountError)}
                                  aria-describedby={recurrenceEndCountError ? 'composer-recurrence-end-count-error' : undefined}
                                />
                              </div>
                              {recurrenceEndCountError ? (
                                <p id="composer-recurrence-end-count-error" className="field-error">{recurrenceEndCountError}</p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="stack composer-expense-split-block">
                      <label className="inline-checkbox">
                        <input
                          type="checkbox"
                          checked={expenseDetailed}
                          onChange={onToggleExpenseDetailed}
                          disabled={disabled}
                        />
                        Split into items
                      </label>
                        {expenseDetailed ? (
                          <div className="stack item-editor">
                            <div className="inline-header">
                              <strong>Items</strong>
                              <span className={expenseRemaining === '0.00' ? 'hint success' : 'hint'}>
                                Remaining: {expenseRemaining} {currencyCode ?? ''}
                              </span>
                            </div>
                            <div className="quick-row">
                              <input
                                aria-label="Item name"
                                value={expenseItemName}
                                onChange={(event) => onSetExpenseItemName(event.target.value)}
                                placeholder="Item name"
                                aria-invalid={Boolean(expenseItemNameError)}
                                aria-describedby={expenseItemNameError ? 'composer-item-name-error' : undefined}
                              />
                              <input
                                aria-label="Item amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={expenseItemAmount}
                                onChange={(event) => onSetExpenseItemAmount(event.target.value)}
                                placeholder="Amount"
                                inputMode="decimal"
                                aria-invalid={Boolean(expenseItemAmountError)}
                                aria-describedby={expenseItemAmountError ? 'composer-item-amount-error' : undefined}
                              />
                            </div>
                            {expenseItemNameError ? <p id="composer-item-name-error" className="field-error">{expenseItemNameError}</p> : null}
                            {expenseItemAmountError ? <p id="composer-item-amount-error" className="field-error">{expenseItemAmountError}</p> : null}
                            <div className="quick-row">
                              <button type="button" className="text-button" onClick={onAddExpenseItem}>
                                Add item
                              </button>
                              <button type="button" className="text-button" onClick={onAssignRemaining}>
                                Assign remaining
                              </button>
                            </div>
                            <ul className="expense-list" aria-label="Expense items">
                              {expenseItems.map((item) => (
                                <li key={item.id} className="expense-item">
                                  <div className="inline-header">
                                    <strong>{item.name}</strong>
                                    <span>{item.amount}</span>
                                  </div>
                                  <div className="quick-row">
                                    <button type="button" className="text-button" onClick={() => onEditExpenseItem(item.id)}>
                                      Edit
                                    </button>
                                    <button type="button" className="text-button" onClick={() => onRemoveExpenseItem(item.id)}>
                                      Remove
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {expenseSplitError ? (
                              <p className="field-error">{expenseSplitError}</p>
                            ) : (
                              <p className="hint">Publish becomes available when Remaining is 0.00.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stack item-editor">
                        <span className="hint">When should this movement be applied?</span>
                        <div className="segmented segmented-2" role="radiogroup" aria-label="Movement timing">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={schedulingMode === 'now'}
                            className={schedulingMode === 'now' ? 'segment active' : 'segment'}
                            disabled={disabled}
                            onClick={() => onSetSchedulingMode('now')}
                          >
                            Now
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={schedulingMode === 'scheduled'}
                            className={schedulingMode === 'scheduled' ? 'segment active' : 'segment'}
                            disabled={disabled}
                            onClick={() => onSetSchedulingMode('scheduled')}
                          >
                            Schedule
                          </button>
                        </div>

                        {scheduledMovementVisible ? (
                          <div className="segmented segmented-2" role="radiogroup" aria-label="Schedule type">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={schedulingKind === 'one_shot'}
                              className={schedulingKind === 'one_shot' ? 'segment active' : 'segment'}
                              disabled={disabled}
                              onClick={() => onSetSchedulingKind('one_shot')}
                            >
                              One-time
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={schedulingKind === 'recurring'}
                              className={schedulingKind === 'recurring' ? 'segment active' : 'segment'}
                              disabled={disabled}
                              onClick={() => onSetSchedulingKind('recurring')}
                            >
                              Recurring
                            </button>
                          </div>
                        ) : null}
                      </div>

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
