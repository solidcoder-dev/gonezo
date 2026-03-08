import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TransactionType } from '../accounts/useAccountsPageModel';

type Props = {
  transactionType: TransactionType;
  amount: string;
  date: string;
  counterparty: string;
  amountError?: string;
  dateError?: string;
  disabled: boolean;
  hasLastAmount: boolean;
  accountLabel: string;
  accountCurrency: string;
  showAdvancedAmountControls: boolean;
  stepSize: string;
  onChangeType: (value: TransactionType) => void;
  onChangeAmount: (value: string) => void;
  onBlurAmount: () => void;
  onChangeDate: (value: string) => void;
  onChangeCounterparty: (value: string) => void;
  onQuickAmount: (delta: number) => void;
  onUseLastAmount: () => void;
  onToday: () => void;
  onYesterday: () => void;
  onToggleAdvancedAmountControls: () => void;
  onChangeStepSize: (value: string) => void;
  onRollUnits: (units: number) => void;
  onSubmit: (event: FormEvent) => Promise<void> | void;
};

export function TransactionComposer({
  transactionType,
  amount,
  date,
  counterparty,
  amountError,
  dateError,
  disabled,
  hasLastAmount,
  accountLabel,
  accountCurrency,
  showAdvancedAmountControls,
  stepSize,
  onChangeType,
  onChangeAmount,
  onBlurAmount,
  onChangeDate,
  onChangeCounterparty,
  onQuickAmount,
  onUseLastAmount,
  onToday,
  onYesterday,
  onToggleAdvancedAmountControls,
  onChangeStepSize,
  onRollUnits,
  onSubmit,
}: Props) {
  const submitText = disabled ? 'Posting transaction...' : 'Post transaction';
  const [rollValue, setRollValue] = useState(0);

  return (
    <form className="stack section-gap" onSubmit={onSubmit} aria-busy={disabled}>
      <h2>Add transaction</h2>
      <p className="hint">Posting to {accountLabel} in {accountCurrency}</p>

      <div className="segmented" role="radiogroup" aria-label="Transaction type">
        <button
          type="button"
          role="radio"
          aria-checked={transactionType === 'expense'}
          className={transactionType === 'expense' ? 'segment active' : 'segment'}
          disabled={disabled}
          onClick={() => onChangeType('expense')}
        >
          Expense
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={transactionType === 'income'}
          className={transactionType === 'income' ? 'segment active' : 'segment'}
          disabled={disabled}
          onClick={() => onChangeType('income')}
        >
          Income
        </button>
      </div>

      <div className="quick-row" aria-label="Quick amount actions">
        <button type="button" className="chip" disabled={disabled} onClick={() => onQuickAmount(10)}>
          +10
        </button>
        <button type="button" className="chip" disabled={disabled} onClick={() => onQuickAmount(20)}>
          +20
        </button>
        <button type="button" className="chip" disabled={disabled} onClick={() => onQuickAmount(50)}>
          +50
        </button>
        <button type="button" className="chip" disabled={disabled || !hasLastAmount} onClick={onUseLastAmount}>
          Use last amount
        </button>
      </div>

      <button type="button" className="text-button" disabled={disabled} onClick={onToggleAdvancedAmountControls}>
        {showAdvancedAmountControls ? 'Hide amount tools' : 'Adjust amount'}
      </button>

      {showAdvancedAmountControls ? (
        <div className="stack compact-stack" aria-label="Advanced amount controls">
          <div className="quick-row" aria-label="Step size">
            {['0.10', '0.50', '1.00', '5.00'].map((value) => (
              <button
                key={value}
                type="button"
                className={stepSize === value ? 'chip active' : 'chip'}
                disabled={disabled}
                onClick={() => onChangeStepSize(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="quick-row" aria-label="Step controls">
            <button type="button" className="chip" disabled={disabled} onClick={() => onRollUnits(-1)}>
              - Step
            </button>
            <button type="button" className="chip" disabled={disabled} onClick={() => onRollUnits(1)}>
              + Step
            </button>
          </div>
          <label htmlFor="roll-amount">Roll amount</label>
          <input
            id="roll-amount"
            type="range"
            min={-5}
            max={5}
            step={1}
            value={rollValue}
            onChange={(event) => {
              const next = Number(event.target.value);
              const delta = next - rollValue;
              if (delta !== 0) {
                onRollUnits(delta);
              }
              setRollValue(next);
            }}
            onMouseUp={() => setRollValue(0)}
            onTouchEnd={() => setRollValue(0)}
            disabled={disabled}
            aria-label="Roll amount"
          />
        </div>
      ) : null}

      <input
        aria-label="Amount"
        value={amount}
        onChange={(event) => onChangeAmount(event.target.value)}
        onBlur={onBlurAmount}
        placeholder="Amount"
        inputMode="decimal"
        disabled={disabled}
      />
      {amountError ? <p className="field-error">{amountError}</p> : null}

      <div className="quick-row" aria-label="Quick date actions">
        <button type="button" className="chip" disabled={disabled} onClick={onToday}>
          Today
        </button>
        <button type="button" className="chip" disabled={disabled} onClick={onYesterday}>
          Yesterday
        </button>
      </div>

      <input
        aria-label="Date"
        type="date"
        value={date}
        onChange={(event) => onChangeDate(event.target.value)}
        disabled={disabled}
      />
      {dateError ? <p className="field-error">{dateError}</p> : null}

      <input
        aria-label="Source or merchant"
        value={counterparty}
        onChange={(event) => onChangeCounterparty(event.target.value)}
        placeholder={transactionType === 'income' ? 'Source (optional)' : 'Merchant (optional)'}
        disabled={disabled}
      />

      <button type="submit" className="primary-cta" disabled={disabled}>
        {submitText}
      </button>
    </form>
  );
}
