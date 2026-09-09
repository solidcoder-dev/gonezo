import { useState } from 'react';
import { SheetView } from '../SheetView';
import { AmountCalculatorKeypadView } from './AmountCalculatorKeypadView';
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
          <AmountCalculatorKeypadView state={calculatorState} currency={currency} dispatch={dispatch} onUseResult={useResultAndContinue} />
          ),
        },
        state: { open },
        status: {},
      }}
      provided={{ commands: { close: onDismiss } }}
    />
  );
}
