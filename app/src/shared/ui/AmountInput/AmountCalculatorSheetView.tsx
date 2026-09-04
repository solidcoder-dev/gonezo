import { useState } from 'react';
import { SheetView } from '../SheetView';
import styles from './AmountInputView.module.css';
import {
  calculatorReducer,
  createCalculatorState,
  type CalculatorOperator,
} from './calculatorEngine';

export type AmountCalculatorSheetViewProps = {
  open: boolean;
  initialValue: string;
  currency?: string;
  onApply: (value: string) => void;
  onCancel: () => void;
};

const operators: Array<{ value: CalculatorOperator; label: string }> = [
  { value: '÷', label: 'Divide' },
  { value: '×', label: 'Multiply' },
  { value: '-', label: 'Subtract' },
  { value: '+', label: 'Add' },
];

export function AmountCalculatorSheetView({ open, initialValue, currency, onApply, onCancel }: AmountCalculatorSheetViewProps) {
  const [calculatorState, setCalculatorState] = useState(() => createCalculatorState(initialValue));

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Amount calculator',
          title: 'Amount calculator',
          closeLabel: 'Close amount calculator',
          showHandle: true,
        },
        data: {
          body: (
            <div className={styles.calculator}>
              <output className={styles.display} aria-live="polite" aria-label={`Calculator result ${calculatorState.display}${currency ? ` ${currency}` : ''}`}>
                {calculatorState.display}
              </output>
              {calculatorState.error ? <p className="gz-field-error" role="alert">{calculatorState.error}</p> : null}
              <div className={styles.keypad} aria-label="Calculator keypad">
                {(['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'] as const).map((digit) => (
                  <button key={digit} type="button" className="btn btn-outline-primary" aria-label={`Digit ${digit}`} onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'digit', value: digit }))}>{digit}</button>
                ))}
                <button type="button" className="btn btn-outline-primary" aria-label="Decimal" onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'decimal' }))}>.</button>
                <button type="button" className="btn btn-outline-primary" aria-label="Backspace" onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'backspace' }))}>⌫</button>
                {operators.map((operator) => (
                  <button key={operator.value} type="button" className="btn btn-outline-primary" aria-label={operator.label} onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'operator', value: operator.value }))}>{operator.value}</button>
                ))}
                <button type="button" className="btn btn-primary" aria-label="Equals" onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'equals' }))}>=</button>
                <button type="button" className="btn btn-outline-secondary" aria-label="Clear" onClick={() => setCalculatorState((current) => calculatorReducer(current, { type: 'clear' }))}>Clear</button>
              </div>
              <div className={styles.actions}>
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => onApply(calculatorState.display)} disabled={Boolean(calculatorState.error)}>Apply</button>
              </div>
            </div>
          ),
        },
        state: { open },
        status: {},
      }}
      provided={{ commands: { close: onCancel } }}
    />
  );
}
