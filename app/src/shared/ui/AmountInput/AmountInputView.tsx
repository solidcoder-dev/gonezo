import { useState, type RefObject } from 'react';
import type { ViewProps } from '../ViewProps';
import { AmountCalculatorSheetView } from './AmountCalculatorSheetView';
import styles from './AmountInputView.module.css';
import { normalizeCalculatorAmount } from './calculatorEngine';

export type AmountInputViewProps = ViewProps<
  {
    label: string;
    currency?: string;
    placeholder?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    calculatorEnabled?: boolean;
  },
  Record<string, never>,
  { value: string },
  { disabled?: boolean; error?: string },
  { change: (value: string) => void }
>;

export function AmountInputView({ required, provided }: AmountInputViewProps) {
  const { label, currency, placeholder, inputRef, calculatorEnabled: configuredCalculatorEnabled } = required.config;
  const { state, status } = required;
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const calculatorEnabled = configuredCalculatorEnabled ?? true;
  const errorId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-error`;

  function openCalculator() {
    setCalculatorOpen(true);
  }

  function closeCalculator() {
    setCalculatorOpen(false);
  }

  function applyCalculatorValue(value: string) {
    provided.commands.change(normalizeCalculatorAmount(value));
    closeCalculator();
  }

  return (
    <>
      <label className={`${styles.field} vstack gap-2`}>
        <span className="visually-hidden">{label}</span>
        <input
          ref={inputRef}
          className={`${styles.input} form-control`}
          aria-label={label}
          type="number"
          min="0.01"
          step="0.01"
          value={state.value}
          placeholder={placeholder ?? 'Amount'}
          disabled={status.disabled}
          onChange={(event) => provided.commands.change(event.target.value)}
          inputMode="decimal"
          aria-invalid={Boolean(status.error)}
          aria-describedby={status.error ? errorId : undefined}
        />
        <span className={styles.suffix}>
          {currency ? <span className={styles.currency}>{currency}</span> : null}
          {calculatorEnabled ? (
            <button
              type="button"
              className="btn btn-link gz-icon-button"
              aria-label="Open amount calculator"
              onClick={openCalculator}
              disabled={status.disabled}
            >
              <i className="bi bi-calculator" aria-hidden />
            </button>
          ) : null}
        </span>
      </label>
      {status.error ? <p id={errorId} className="gz-field-error">{status.error}</p> : null}

      <AmountCalculatorSheetView
        key={calculatorOpen ? 'open' : 'closed'}
        open={calculatorOpen}
        initialValue={state.value}
        currency={currency}
        onApply={applyCalculatorValue}
        onCancel={closeCalculator}
      />
    </>
  );
}
