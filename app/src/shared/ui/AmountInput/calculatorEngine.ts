export type CalculatorOperator = '+' | '-' | '×' | '÷';
export type CalculatorDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type CalculatorState = {
  display: string;
  leftOperand: string | null;
  pendingOperator: CalculatorOperator | null;
  awaitingOperand: boolean;
  error: string | null;
};

export type CalculatorAction =
  | { type: 'digit'; value: CalculatorDigit }
  | { type: 'decimal' }
  | { type: 'operator'; value: CalculatorOperator }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'clear' };

export type CalculatorTransition = {
  state: CalculatorState;
  resolvedValue?: string;
  finished?: boolean;
};

const MONEY_SCALE = 100n;

function parseMoney(value: string): bigint {
  const normalized = value.trim().replace(',', '.');
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{0,}))?$/);
  if (!match) {
    return 0n;
  }
  const fraction = (match[3] ?? '').padEnd(2, '0').slice(0, 2);
  return BigInt(`${match[1] === '-' ? '-' : ''}${match[2]}${fraction}`);
}

function formatMoney(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const units = absolute / MONEY_SCALE;
  const cents = (absolute % MONEY_SCALE).toString().padStart(2, '0');
  return `${sign}${units}.${cents}`;
}

function calculate(left: string, right: string, operator: CalculatorOperator): string | null {
  const leftCents = parseMoney(left);
  const rightCents = parseMoney(right);
  if (operator === '÷' && rightCents === 0n) {
    return null;
  }

  if (operator === '+') return formatMoney(leftCents + rightCents);
  if (operator === '-') return formatMoney(leftCents - rightCents);
  if (operator === '×') return formatMoney((leftCents * rightCents + 50n) / MONEY_SCALE);
  return formatMoney((leftCents * MONEY_SCALE + (rightCents < 0n ? -rightCents : rightCents) / 2n) / rightCents);
}

function clearState(): CalculatorState {
  return {
    display: '0',
    leftOperand: null,
    pendingOperator: null,
    awaitingOperand: false,
    error: null,
  };
}

export function createCalculatorState(initialValue: string): CalculatorState {
  const initial = initialValue.trim();
  return {
    ...clearState(),
    display: /^\d+(?:\.\d*)?$/.test(initial) ? initial : '0',
  };
}

export function transitionCalculator(state: CalculatorState, action: CalculatorAction): CalculatorTransition {
  if (action.type === 'clear') return { state: clearState() };
  if (state.error) return {
    state: action.type === 'digit' || action.type === 'decimal' ? transitionCalculator(clearState(), action).state : state,
  };

  if (action.type === 'digit') {
    const display = state.awaitingOperand || state.display === '0' ? action.value : `${state.display}${action.value}`;
    return { state: { ...state, display, awaitingOperand: false } };
  }

  if (action.type === 'decimal') {
    if (state.awaitingOperand) return { state: { ...state, display: '0.', awaitingOperand: false } };
    return { state: state.display.includes('.') ? state : { ...state, display: `${state.display}.` } };
  }

  if (action.type === 'backspace') {
    if (state.awaitingOperand) return { state };
    const display = state.display.length > 1 ? state.display.slice(0, -1) : '0';
    return { state: { ...state, display } };
  }

  if (action.type === 'operator') {
    if (state.pendingOperator && state.awaitingOperand) return { state: { ...state, pendingOperator: action.value } };
    if (!state.pendingOperator) return { state: { ...state, leftOperand: state.display, pendingOperator: action.value, awaitingOperand: true } };
    const result = calculate(state.leftOperand ?? '0', state.display, state.pendingOperator);
    return result === null
      ? { state: { ...state, display: 'Error', error: 'Cannot divide by zero' } }
      : { state: { ...state, display: result, leftOperand: result, pendingOperator: action.value, awaitingOperand: true }, resolvedValue: result };
  }

  if (!state.pendingOperator || state.leftOperand === null) {
    const result = formatMoney(parseMoney(state.display));
    return { state: { ...state, display: result, awaitingOperand: true }, resolvedValue: result, finished: true };
  }
  const result = calculate(state.leftOperand, state.display, state.pendingOperator);
  return result === null
    ? { state: { ...state, display: 'Error', error: 'Cannot divide by zero' } }
    : { state: { display: result, leftOperand: null, pendingOperator: null, awaitingOperand: true, error: null }, resolvedValue: result, finished: true };
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  return transitionCalculator(state, action).state;
}

export function normalizeCalculatorAmount(value: string): string {
  return /^-?\d+(?:\.\d*)?$/.test(value.trim()) ? formatMoney(parseMoney(value)) : '0.00';
}
