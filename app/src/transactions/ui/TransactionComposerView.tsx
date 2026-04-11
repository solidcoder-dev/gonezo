import { useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { CategoryComboboxField } from './CategoryComboboxField';
import { TagComboboxField } from './TagComboboxField';
import type { RecurrenceEndInput, RecurrenceFrequency, RecurrenceMonthlyPattern } from '../../shared/domain/corePort';

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
  recurrenceEnabled: boolean;
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
  onRemoveExpenseItem: (itemId: string) => void;
  onAssignRemaining: () => void;
  onSetRecurrenceEnabled: (value: boolean) => void;
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
    recurrenceEnabled,
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
    onRemoveExpenseItem,
    onAssignRemaining,
    onSetRecurrenceEnabled,
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

  const submitLabel = useMemo(() => {
    if (recurrenceEnabled) return 'Save recurring';
    if (mode === 'expense') return expenseDetailed ? 'Publish expense' : 'Save expense';
    if (mode === 'income') return 'Save income';
    if (mode === 'transfer') return 'Save transfer';
    return 'Continue';
  }, [mode, expenseDetailed, recurrenceEnabled]);

  const amountLabel = mode === 'transfer'
    ? `Amount out${currencyCode ? ` (${currencyCode})` : ''}`
    : 'Amount';

  const amountInLabel = `Amount in${transferDestinationCurrency ? ` (${transferDestinationCurrency})` : ''}`;
  const fxLabel = `FX rate${transferDestinationCurrency && currencyCode ? ` (${transferDestinationCurrency}/${currencyCode})` : ''}`;

  const splitReady = useMemo(() => {
    if (mode !== 'expense' || !expenseDetailed) {
      return true;
    }
    return expenseItems.length > 0 && Number(expenseRemaining) === 0;
  }, [expenseDetailed, expenseItems.length, expenseRemaining, mode]);

  if (!open) {
    return (
      <button type="button" className="fab-button" onClick={onOpen} aria-label="Add movement">
        + Movement
      </button>
    );
  }

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section className="sheet-panel composer-sheet" role="dialog" aria-modal="true" aria-label="Transaction composer" onClick={(event) => event.stopPropagation()}>
        <div className="inline-header">
          <h3>{titleForMode(mode)}</h3>
          <button
            type="button"
            className="text-button icon-button"
            onClick={onClose}
            aria-label="Close transaction composer"
          >
            ×
          </button>
        </div>

        {mode === 'picker' ? (
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
          <form className="stack composer-form" onSubmit={onSubmit} aria-busy={disabled}>
            <label className="stack">
              {amountLabel}
              <input
                ref={amountInputRef}
                aria-label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => onSetAmount(event.target.value)}
                inputMode="decimal"
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? 'composer-amount-error' : undefined}
              />
            </label>
            {amountError ? <p id="composer-amount-error" className="field-error">{amountError}</p> : null}

            {mode === 'transfer' ? (
              <div className="stack item-editor">
                <label className="stack">
                  Destination account
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

                <label className="stack">
                  {amountInLabel}
                  <input
                    aria-label={amountInLabel}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transferAmountIn}
                    onChange={(event) => onSetTransferAmountIn(event.target.value)}
                    inputMode="decimal"
                    disabled={disabled || !transferCrossCurrency || transferFxMode === 'auto_destination'}
                    aria-invalid={Boolean(transferAmountInError)}
                    aria-describedby={transferAmountInError ? 'composer-transfer-amount-in-error' : undefined}
                  />
                </label>
                {transferAmountInError ? <p id="composer-transfer-amount-in-error" className="field-error">{transferAmountInError}</p> : null}

                {transferCrossCurrency ? (
                  <>
                    <label className="stack">
                      {fxLabel}
                      <input
                        aria-label={fxLabel}
                        type="number"
                        min="0.0000001"
                        step="0.0001"
                        value={transferFxRate}
                        onChange={(event) => onSetTransferFxRate(event.target.value)}
                        inputMode="decimal"
                        disabled={disabled || transferFxMode === 'auto_rate'}
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
                  </>
                ) : (
                  <p className="hint">Same currency transfer uses 1:1 amount.</p>
                )}
              </div>
            ) : null}

            <div className="inline-header">
              <span className="hint">Need more fields?</span>
              <button type="button" className="text-button" onClick={onToggleAdvanced} aria-label="Toggle advanced options">
                {advancedOpen ? 'Hide options' : 'More options'}
              </button>
            </div>

            {advancedOpen ? (
              <>
                <label className="stack">
                  Date
                  <input
                    aria-label="Date"
                    type="date"
                    value={date}
                    onChange={(event) => onSetDate(event.target.value)}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? 'composer-date-error' : undefined}
                  />
                </label>
                {dateError ? <p id="composer-date-error" className="field-error">{dateError}</p> : null}
                <label className="stack">
                  {mode === 'expense' ? 'Merchant (optional)' : mode === 'income' ? 'Source (optional)' : 'Note (optional)'}
                  <input
                    aria-label="Note"
                    value={note}
                    onChange={(event) => onSetNote(event.target.value)}
                    placeholder={mode === 'expense' ? 'Merchant' : mode === 'income' ? 'Source' : 'Note'}
                  />
                </label>

                {mode === 'expense' || mode === 'income' ? (
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
                ) : null}

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

                <div className="stack item-editor">
                  <label className="inline-checkbox">
                    <input
                      type="checkbox"
                      checked={recurrenceEnabled}
                      onChange={(event) => onSetRecurrenceEnabled(event.target.checked)}
                      disabled={disabled}
                    />
                    Repeat this movement
                  </label>

                  {recurrenceEnabled ? (
                    <>
                      <label className="stack">
                        Frequency
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
                      </label>

                      <label className="stack">
                        Every
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
                      </label>
                      {recurrenceIntervalError ? (
                        <p id="composer-recurrence-interval-error" className="field-error">{recurrenceIntervalError}</p>
                      ) : null}

                      {recurrenceFrequency === 'weekly' ? (
                        <label className="stack">
                          Weekday
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
                        </label>
                      ) : null}

                      {recurrenceFrequency === 'monthly' ? (
                        <>
                          <label className="stack">
                            Monthly rule
                            <select
                              aria-label="Monthly recurrence rule"
                              value={recurrenceMonthlyPattern}
                              onChange={(event) => onSetRecurrenceMonthlyPattern(event.target.value as RecurrenceMonthlyPattern)}
                            >
                              <option value="day_of_month">Day of month</option>
                              <option value="nth_weekday">Nth weekday</option>
                            </select>
                          </label>

                          {recurrenceMonthlyPattern === 'day_of_month' ? (
                            <label className="stack">
                              Day of month
                              <input
                                aria-label="Monthly day of month"
                                type="number"
                                min="1"
                                max="31"
                                step="1"
                                value={recurrenceDayOfMonth}
                                onChange={(event) => onSetRecurrenceDayOfMonth(event.target.value)}
                              />
                            </label>
                          ) : (
                            <div className="quick-row">
                              <label className="stack">
                                Ordinal
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
                              </label>
                              <label className="stack">
                                Weekday
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
                              </label>
                            </div>
                          )}
                        </>
                      ) : null}

                      <label className="stack">
                        Ends
                        <select
                          aria-label="Recurrence end"
                          value={recurrenceEndKind}
                          onChange={(event) => onSetRecurrenceEndKind(event.target.value as RecurrenceEndInput['kind'])}
                        >
                          <option value="never">Never</option>
                          <option value="on_date">On date</option>
                          <option value="after_occurrences">After count</option>
                        </select>
                      </label>

                      {recurrenceEndKind === 'on_date' ? (
                        <>
                          <label className="stack">
                            End date
                            <input
                              aria-label="Recurrence end date"
                              type="date"
                              value={recurrenceEndDate}
                              onChange={(event) => onSetRecurrenceEndDate(event.target.value)}
                              aria-invalid={Boolean(recurrenceEndDateError)}
                              aria-describedby={recurrenceEndDateError ? 'composer-recurrence-end-date-error' : undefined}
                            />
                          </label>
                          {recurrenceEndDateError ? (
                            <p id="composer-recurrence-end-date-error" className="field-error">{recurrenceEndDateError}</p>
                          ) : null}
                        </>
                      ) : null}

                      {recurrenceEndKind === 'after_occurrences' ? (
                        <>
                          <label className="stack">
                            Occurrences
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
                          </label>
                          {recurrenceEndCountError ? (
                            <p id="composer-recurrence-end-count-error" className="field-error">{recurrenceEndCountError}</p>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </>
            ) : null}

            {mode === 'expense' ? (
              <div className="stack">
                <label className="inline-checkbox">
                  <input
                    type="checkbox"
                    checked={expenseDetailed}
                    onChange={onToggleExpenseDetailed}
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
                          <button type="button" className="text-button" onClick={() => onRemoveExpenseItem(item.id)}>
                            Remove
                          </button>
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
            ) : null}

            <button type="submit" className="primary-cta" disabled={disabled || !splitReady}>
              {submitLabel}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
