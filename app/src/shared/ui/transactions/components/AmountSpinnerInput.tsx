import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type AmountSpinnerInputRequired = {
  amount: string;
  disabled: boolean;
};

export type AmountSpinnerInputProvided = {
  onRollUnits: (units: number) => void;
  onSetAmount: (value: string) => void;
  onFormatAmount: () => void;
};

export type AmountSpinnerInputProps = {
  required: AmountSpinnerInputRequired;
  provided: AmountSpinnerInputProvided;
};

export function AmountSpinnerInput({ required, provided }: AmountSpinnerInputProps) {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const numericAmount = Number(required.amount);
  const amountValueForAria = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0.01;

  const dragRef = useRef({
    active: false,
    locked: false,
    startX: 0,
    startY: 0,
    lastY: 0,
  });

  function onRollStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (required.disabled) {
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

    const stepThreshold = 18;
    const deltaY = event.clientY - dragRef.current.lastY;
    const units = Math.trunc(deltaY / stepThreshold);
    if (units !== 0) {
      provided.onRollUnits(-units);
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
    provided.onFormatAmount();
    setIsEditingAmount(false);
  }

  return (
    <div className="amount-spinner" aria-label="Amount spinner">
      <button
        type="button"
        className="spinner-btn"
        aria-label="Increase amount by current step"
        disabled={required.disabled}
        onClick={() => provided.onRollUnits(1)}
      >
        ▲
      </button>
      {isEditingAmount ? (
        <input
          aria-label="Amount value"
          type="number"
          min="0.01"
          step="0.01"
          value={required.amount}
          onChange={(event) => provided.onSetAmount(event.target.value)}
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
          aria-valuemin={0.01}
          aria-valuemax={5}
          aria-valuenow={amountValueForAria}
          onPointerDown={onRollStart}
          onPointerMove={onRollMove}
          onPointerUp={onRollEnd}
          onPointerCancel={onRollEnd}
          onClick={() => setIsEditingAmount(true)}
        >
          {required.amount || '0.00'}
        </div>
      )}
      <button
        type="button"
        className="spinner-btn"
        aria-label="Decrease amount by current step"
        disabled={required.disabled}
        onClick={() => provided.onRollUnits(-1)}
      >
        ▼
      </button>
    </div>
  );
}
