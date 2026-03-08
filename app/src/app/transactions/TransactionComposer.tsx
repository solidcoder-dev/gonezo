import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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
  showStepSettings: boolean;
  stepSize: string;
  onChangeType: (value: TransactionType) => void;
  onSetAmount: (value: string) => void;
  onFormatAmount: () => void;
  onChangeDate: (value: string) => void;
  onChangeCounterparty: (value: string) => void;
  onUseLastAmount: () => void;
  onToday: () => void;
  onYesterday: () => void;
  onToggleStepSettings: () => void;
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
  showStepSettings,
  stepSize,
  onChangeType,
  onSetAmount,
  onFormatAmount,
  onChangeDate,
  onChangeCounterparty,
  onUseLastAmount,
  onToday,
  onYesterday,
  onToggleStepSettings,
  onChangeStepSize,
  onRollUnits,
  onSubmit,
}: Props) {
  const submitText = disabled ? 'Posting transaction...' : 'Post transaction';
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  const dragRef = useRef({
    active: false,
    locked: false,
    startX: 0,
    startY: 0,
    lastY: 0,
  });

  function onRollStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }
    event.preventDefault();

    dragRef.current = {
      active: true,
      locked: false,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onRollMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) {
      return;
    }
    event.preventDefault();

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const lockThreshold = 8;

    if (!dragRef.current.locked) {
      if (Math.abs(dx) < lockThreshold && Math.abs(dy) < lockThreshold) {
        return;
      }
      if (Math.abs(dy) <= Math.abs(dx)) {
        return;
      }
      dragRef.current.locked = true;
    }

    event.preventDefault();
    const stepThreshold = 18;
    const deltaY = event.clientY - dragRef.current.lastY;
    const units = Math.trunc(deltaY / stepThreshold);
    if (units !== 0) {
      onRollUnits(-units);
      dragRef.current.lastY += units * stepThreshold;
    }
  }

  function onRollEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) {
      return;
    }
    dragRef.current.active = false;
    dragRef.current.locked = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function finishAmountEditing() {
    onFormatAmount();
    setIsEditingAmount(false);
  }

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

      <div className="amount-spinner" aria-label="Amount spinner">
        <button
          type="button"
          className="spinner-btn"
          aria-label="Increase amount"
          disabled={disabled}
          onClick={() => onRollUnits(1)}
        >
          ▲
        </button>
        {isEditingAmount ? (
          <input
            aria-label="Amount value"
            value={amount}
            onChange={(event) => onSetAmount(event.target.value)}
            onBlur={finishAmountEditing}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                finishAmountEditing();
              }
            }}
            inputMode="decimal"
            autoFocus
          />
        ) : (
          <div
            className="amount-display"
            aria-label="Current amount"
            role="slider"
            aria-valuemin={-5}
            aria-valuemax={5}
            aria-valuenow={0}
            onPointerDown={onRollStart}
            onPointerMove={onRollMove}
            onPointerUp={onRollEnd}
            onPointerCancel={onRollEnd}
            onClick={() => setIsEditingAmount(true)}
          >
            {amount || '0.00'}
          </div>
        )}
        <button
          type="button"
          className="spinner-btn"
          aria-label="Decrease amount"
          disabled={disabled}
          onClick={() => onRollUnits(-1)}
        >
          ▼
        </button>
      </div>
      {amountError ? <p className="field-error">{amountError}</p> : null}

      <div className="quick-row" aria-label="Amount helpers">
        <button type="button" className="text-button" disabled={disabled || !hasLastAmount} onClick={onUseLastAmount}>
          Use last amount
        </button>
        <button type="button" className="text-button" disabled={disabled} onClick={onToggleStepSettings}>
          {showStepSettings ? 'Hide more steps' : 'More steps'}
        </button>
      </div>

      <div className="quick-row" aria-label="Step size">
        {['0.01', '0.10', '1.00'].map((value) => (
          <button
            key={value}
            type="button"
            className={stepSize === value ? 'chip active' : 'chip'}
            disabled={disabled}
            onClick={() => onChangeStepSize(value)}
          >
            Step {value}
          </button>
        ))}
      </div>

      {showStepSettings ? (
        <div className="quick-row" aria-label="More step size">
          {['0.50', '5.00'].map((value) => (
            <button
              key={value}
              type="button"
              className={stepSize === value ? 'chip active' : 'chip'}
              disabled={disabled}
              onClick={() => onChangeStepSize(value)}
            >
              Step {value}
            </button>
          ))}
        </div>
      ) : null}

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
