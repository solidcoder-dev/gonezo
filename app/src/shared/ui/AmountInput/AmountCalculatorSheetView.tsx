import { useState } from 'react';
import { SheetView } from '../SheetView';
import styles from './AmountCalculatorSheetView.module.css';
import {
  createCalculatorState,
  resolveCalculatorValue,
  transitionCalculator,
  type CalculatorAction,
} from './calculatorEngine';

export type AmountCalculatorSheetViewProps = {
  open: boolean;
  initialValue: string;
  currency?: string;
  onUseResult: (value: string) => void;
  onDismiss: () => void;
};

const KEYPAD_ROWS: Array<Array<CalculatorAction & { label: string; display: string }>> = [
  [
    { type: 'digit', value: '7', label: 'Digit 7', display: '7' }, { type: 'digit', value: '8', label: 'Digit 8', display: '8' }, { type: 'digit', value: '9', label: 'Digit 9', display: '9' }, { type: 'operator', value: '÷', label: 'Divide', display: '÷' },
  ],
  [
    { type: 'digit', value: '4', label: 'Digit 4', display: '4' }, { type: 'digit', value: '5', label: 'Digit 5', display: '5' }, { type: 'digit', value: '6', label: 'Digit 6', display: '6' }, { type: 'operator', value: '×', label: 'Multiply', display: '×' },
  ],
  [
    { type: 'digit', value: '1', label: 'Digit 1', display: '1' }, { type: 'digit', value: '2', label: 'Digit 2', display: '2' }, { type: 'digit', value: '3', label: 'Digit 3', display: '3' }, { type: 'operator', value: '-', label: 'Subtract', display: '−' },
  ],
  [
    { type: 'digit', value: '0', label: 'Digit 0', display: '0' }, { type: 'decimal', label: 'Decimal', display: '.' }, { type: 'equals', label: 'Equals', display: '=' }, { type: 'operator', value: '+', label: 'Add', display: '+' },
  ],
];

export function AmountCalculatorSheetView({ open, initialValue, currency, onUseResult, onDismiss }: AmountCalculatorSheetViewProps) {
  const [calculatorState, setCalculatorState] = useState(() => createCalculatorState(initialValue));

  function dispatch(action: CalculatorAction) {
    const transition = transitionCalculator(calculatorState, action);
    setCalculatorState(transition.state);
  }

  function useResultAndContinue() {
    const result = resolveCalculatorValue(calculatorState);
    if (result !== null) onUseResult(result);
  }

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Amount calculator',
          showHandle: true,
          dragToClose: true,
        },
        data: {
          body: (
            <div className={styles.calculator}>
              <div className={styles.displayArea}>
                <button type="button" className={styles.displayControl} aria-label="Clear" onClick={() => dispatch({ type: 'clear' })}>C</button>
                <output className={styles.display} aria-live="polite" aria-label={`Calculator result ${calculatorState.display}${currency ? ` ${currency}` : ''}`}>{calculatorState.display}</output>
                <button type="button" className={styles.displayControl} aria-label="Backspace" onClick={() => dispatch({ type: 'backspace' })}><i className="bi bi-backspace" aria-hidden /></button>
              </div>
              {calculatorState.error ? <p className="gz-field-error" role="alert">{calculatorState.error}</p> : null}
              <div className={styles.keypad} role="group" aria-label="Calculator keypad">
                {KEYPAD_ROWS.flat().map((key) => <button key={key.label} type="button" className={`${styles.key} ${key.type === 'operator' ? styles.operator : ''} ${key.type === 'equals' ? styles.equals : ''}`} aria-label={key.label} onClick={() => dispatch(key)}>{key.display}</button>)}
              </div>
              <button type="button" className={styles.continue} aria-label="Use result and continue" onClick={useResultAndContinue}>
                <i className="bi bi-arrow-right" aria-hidden />
              </button>
            </div>
          ),
        },
        state: { open },
        status: {},
      }}
      provided={{ commands: { close: onDismiss } }}
    />
  );
}
