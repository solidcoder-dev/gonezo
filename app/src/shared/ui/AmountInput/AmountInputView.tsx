import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ViewProps } from '../ViewProps';
import { currencySymbol } from '../../utils/formatting';
import { AmountCalculatorKeypadView } from './AmountCalculatorKeypadView';
import { useBackDismissable } from '../useBackDismissable';
import { createCalculatorState, resolveCalculatorValue, transitionCalculator, type CalculatorAction, type CalculatorState } from './calculatorEngine';

let activeCalculatorDismiss: (() => void) | undefined;
import styles from './AmountInputView.module.css';

export type AmountInputViewProps = ViewProps<
  {
    label: string;
    currency?: string;
    placeholder?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    calculatorEnabled?: boolean;
    variant?: 'default' | 'primary';
    showCurrencyLabel?: boolean;
    showLabel?: boolean;
  },
  Record<string, never>,
  { value: string },
  { disabled?: boolean; error?: string },
  { change: (value: string) => void; continueEditing?: () => void }
>;

export function AmountInputView({ required, provided }: AmountInputViewProps) {
  const { label, currency, placeholder, inputRef, calculatorEnabled: configuredCalculatorEnabled, variant = 'default', showCurrencyLabel = true, showLabel = false } = required.config;
  const { state, status } = required;
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [continueAfterCalculator, setContinueAfterCalculator] = useState(false);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>(() => createCalculatorState(state.value));
  const openerRef = useRef<HTMLInputElement | null>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const continuationSentRef = useRef(false);
  const continueEditingRef = useRef(provided.commands.continueEditing);
  const calculatorEnabled = configuredCalculatorEnabled ?? true;
  const emptyValuePresentation = variant === 'primary' && currency
    ? `${currencySymbol(currency)}0.00`
    : variant === 'primary' ? '0.00' : placeholder ?? 'Amount';
  const errorId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-error`;

  function openCalculator() {
    activeCalculatorDismiss?.();
    activeCalculatorDismiss = () => setCalculatorOpen(false);
    openerRef.current = internalInputRef.current;
    internalInputRef.current?.blur();
    setCalculatorState(createCalculatorState(state.value));
    setContinueAfterCalculator(false);
    continuationSentRef.current = false;
    setCalculatorOpen(true);
  }

  function closeCalculator() {
    setCalculatorOpen(false);
    activeCalculatorDismiss = undefined;
    openerRef.current?.focus();
  }

  function commitCalculatorResult(value: string) {
    provided.commands.change(value);
    setContinueAfterCalculator(true);
    setCalculatorOpen(false);
  }

  function dispatchCalculator(action: CalculatorAction) {
    setCalculatorState((current) => transitionCalculator(current, action).state);
  }

  useBackDismissable({ canDismiss: () => calculatorOpen, dismiss: closeCalculator }, calculatorOpen);

  useEffect(() => {
    continueEditingRef.current = provided.commands.continueEditing;
  }, [provided.commands.continueEditing]);

  useEffect(() => {
    if (calculatorOpen || !continueAfterCalculator) return;
    if (continuationSentRef.current) return;
    continuationSentRef.current = true;
    continueEditingRef.current?.();
  }, [calculatorOpen, continueAfterCalculator]);

  return (
    <>
      <label className={`${styles.field} vstack gap-2`}>
        <span className={showLabel ? '' : 'visually-hidden'}>{label}</span>
        <input
          ref={(element) => {
            internalInputRef.current = element;
            if (inputRef) inputRef.current = element;
          }}
          className={`${styles.input} ${variant === 'primary' ? styles.primary : ''} form-control border-0 bg-transparent shadow-none px-0 pe-5`}
          aria-label={label}
          type="number"
          min="0.01"
          step="0.01"
          value={state.value}
          placeholder={emptyValuePresentation}
          disabled={status.disabled}
          onChange={(event) => provided.commands.change(event.target.value)}
          inputMode="decimal"
          aria-invalid={Boolean(status.error)}
          aria-describedby={status.error ? errorId : undefined}
        />
        <span className={styles.suffix}>
          {currency && showCurrencyLabel ? <span className={styles.currency}>{currency}</span> : null}
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

      {calculatorOpen ? (
        <div className={styles.dock} role="dialog" aria-label="Amount calculator">
          <AmountCalculatorKeypadView
            state={calculatorState}
            currency={currency}
            dispatch={dispatchCalculator}
            onUseResult={() => {
              const result = resolveCalculatorValue(calculatorState);
              if (result !== null) commitCalculatorResult(result);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
