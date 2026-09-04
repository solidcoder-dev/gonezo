import { describe, expect, it } from 'vitest';
import { calculatorReducer, createCalculatorState, transitionCalculator, type CalculatorAction, type CalculatorDigit } from './calculatorEngine';

function press(state: ReturnType<typeof createCalculatorState>, ...actions: Parameters<typeof calculatorReducer>[1][]) {
  return actions.reduce(calculatorReducer, state);
}

describe('calculatorEngine', () => {
  it('supports digits, decimal, backspace and clear', () => {
    let state = createCalculatorState('');
    state = press(state, { type: 'digit', value: '1' }, { type: 'digit', value: '2' }, { type: 'decimal' });
    state = press(state, { type: 'digit', value: '5' }, { type: 'backspace' });

    expect(state.display).toBe('12.');
    expect(calculatorReducer(state, { type: 'clear' }).display).toBe('0');
  });

  it.each([
    ['+', '12.50', '2.5'],
    ['-', '7.50', '2.5'],
    ['×', '25.00', '2.5'],
    ['÷', '4.00', '2.5'],
  ] as const)('calculates %s', (operator, expected, operand) => {
    const operandActions: CalculatorAction[] = operand.split('').map((value) => value === '.'
      ? { type: 'decimal' }
      : { type: 'digit', value: value as CalculatorDigit });
    const result = press(createCalculatorState('10'), { type: 'operator', value: operator }, ...operandActions, { type: 'equals' });
    expect(result.display).toBe(expected);
  });

  it('supports chained operations and replaces an operator before entering the next operand', () => {
    const result = press(
      createCalculatorState('10'),
      { type: 'operator', value: '+' },
      { type: 'digit', value: '2' },
      { type: 'equals' },
      { type: 'operator', value: '×' },
      { type: 'digit', value: '2' },
      { type: 'operator', value: '-' },
      { type: 'digit', value: '5' },
      { type: 'equals' },
    );

    expect(result.display).toBe('19.00');
  });

  it('reports immediate results while keeping the next operator pending', () => {
    let state = createCalculatorState('10');
    state = press(state, { type: 'operator', value: '+' }, { type: 'digit', value: '2' });
    const transition = transitionCalculator(state, { type: 'operator', value: '+' });

    expect(transition.resolvedValue).toBe('12.00');
    expect(transition.state.display).toBe('12.00');
    expect(transition.state.pendingOperator).toBe('+');
  });

  it('resolves repeated immediate operations and final equals', () => {
    let state = createCalculatorState('10');
    state = press(state, { type: 'operator', value: '+' }, { type: 'digit', value: '2' });
    const first = transitionCalculator(state, { type: 'operator', value: '+' });
    const second = transitionCalculator(first.state, { type: 'digit', value: '3' });
    const final = transitionCalculator(second.state, { type: 'operator', value: '+' });

    expect(first.resolvedValue).toBe('12.00');
    expect(final.resolvedValue).toBe('15.00');
    expect(final.state.pendingOperator).toBe('+');
  });

  it('reports a final direct value without a pending operation', () => {
    const transition = transitionCalculator(createCalculatorState('25'), { type: 'equals' });

    expect(transition.resolvedValue).toBe('25.00');
    expect(transition.finished).toBe(true);
  });

  it('uses decimal money arithmetic and controls division by zero', () => {
    const result = press(
      createCalculatorState('0.1'),
      { type: 'operator', value: '+' },
      { type: 'digit', value: '0' },
      { type: 'decimal' },
      { type: 'digit', value: '2' },
      { type: 'equals' },
    );
    expect(result.display).toBe('0.30');

    const divisionByZero = press(createCalculatorState('10'), { type: 'operator', value: '÷' }, { type: 'digit', value: '0' }, { type: 'equals' });
    expect(divisionByZero.error).toBe('Cannot divide by zero');
    expect(divisionByZero.display).toBe('Error');
    expect(Number.isFinite(Number(divisionByZero.display))).toBe(false);
  });

  it('initializes from an existing amount', () => {
    expect(createCalculatorState('25.50').display).toBe('25.50');
  });
});
