import type { SchedulingEndInput } from '../../scheduling/application/schedulingCore.port';
import type { ComposerMode, TransactionFieldErrors } from './transactions.types';

export type TransactionComposerValidationInput = {
  accountId: string | null;
  mode: ComposerMode;
  amount: string;
  transactionDate: string;
  schedulingMode: 'now' | 'scheduled';
  recurrenceEnabled: boolean;
  expectedMovement: boolean;
  editedExpectedMovementId: string;
  editedScheduledMovementId: string;
  postExpectedMovementId: string;
  transferToAccountId: string;
  transferTarget?: { id: string; currency: string };
  accountCurrency: string;
  transferAmountIn: string;
  transferFxRate: string;
  transferFxMode: 'auto_destination' | 'auto_rate';
  expenseDetailed: boolean;
  expenseItemsLength: number;
  expenseRemaining: string;
  recurrenceInterval: string;
  recurrenceEndKind: SchedulingEndInput['kind'];
  recurrenceEndDate: string;
  recurrenceEndCount: string;
  todayIso: string;
  nowMs?: number;
};

export type TransactionComposerValidationResult = {
  blockingError?: string;
  errors: TransactionFieldErrors;
  resolvedTransactionDate: string;
  movementExpected: boolean;
  movementScheduled: boolean;
  transferCrossCurrencySelection: boolean;
};

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isFutureIsoDateInput(dateInput: string, todayIso: string): boolean {
  const trimmed = dateInput.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }
  return trimmed > todayIso;
}

function isFutureDate(value: string, todayIso: string, nowMs: number): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value > todayIso;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > nowMs;
}

function isBeforeToday(value: string, todayIso: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value < todayIso;
  }
  const parsed = new Date(value);
  const todayMidnight = new Date(`${todayIso}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < todayMidnight.getTime();
}

function hasErrors(errors: TransactionFieldErrors): boolean {
  return Boolean(
    errors.amount
    || errors.transferAmountIn
    || errors.transferFxRate
    || errors.date
    || errors.recurrenceInterval
    || errors.recurrenceEndDate
    || errors.recurrenceEndCount
    || errors.expenseItemName
    || errors.expenseItemAmount
    || errors.expenseSplit
  );
}

export function hasTransactionComposerValidationErrors(errors: TransactionFieldErrors): boolean {
  return hasErrors(errors);
}

export function validateTransactionComposerSubmission(
  input: TransactionComposerValidationInput,
): TransactionComposerValidationResult {
  const errors: TransactionFieldErrors = {};
  const resolvedTransactionDate = input.transactionDate.trim() || input.todayIso;
  const nowMs = input.nowMs ?? Date.now();

  if (!input.accountId) {
    return {
      blockingError: 'Select an account first.',
      errors,
      resolvedTransactionDate,
      movementExpected: false,
      movementScheduled: false,
      transferCrossCurrencySelection: false,
    };
  }

  const amount = input.amount.trim();
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.amount = 'Enter a valid amount greater than 0.';
  }

  const editingScheduledMovement = Boolean(input.editedScheduledMovementId);
  const movementExpected = (input.mode === 'expense' || input.mode === 'income')
    && input.expectedMovement
    && !editingScheduledMovement;
  const movementScheduled = (input.mode === 'expense' || input.mode === 'income')
    && !movementExpected
    && !input.editedExpectedMovementId
    && !input.postExpectedMovementId
    && !editingScheduledMovement
    && (input.recurrenceEnabled || isFutureIsoDateInput(resolvedTransactionDate, input.todayIso));

  if (!movementExpected && input.mode !== 'expense') {
    if (input.schedulingMode === 'now' && input.transactionDate && isFutureDate(resolvedTransactionDate, input.todayIso, nowMs)) {
      errors.date = 'Manual movements cannot use a future date.';
    }
    if (input.schedulingMode === 'scheduled' && input.transactionDate && isBeforeToday(resolvedTransactionDate, input.todayIso)) {
      errors.date = 'Scheduled movements must use today or a future date.';
    }
  }

  if (input.mode === 'transfer' && !input.transferToAccountId) {
    return {
      blockingError: 'Select a destination account for transfer.',
      errors,
      resolvedTransactionDate,
      movementExpected,
      movementScheduled,
      transferCrossCurrencySelection: false,
    };
  }

  if (input.mode === 'transfer' && input.transferToAccountId === input.accountId) {
    return {
      blockingError: 'Source and destination accounts must be different.',
      errors,
      resolvedTransactionDate,
      movementExpected,
      movementScheduled,
      transferCrossCurrencySelection: false,
    };
  }

  if (input.mode === 'transfer' && !input.transferTarget) {
    return {
      blockingError: 'Select a valid destination account.',
      errors,
      resolvedTransactionDate,
      movementExpected,
      movementScheduled,
      transferCrossCurrencySelection: false,
    };
  }

  const transferCrossCurrencySelection = Boolean(
    input.mode === 'transfer'
    && input.transferTarget
    && input.transferTarget.currency.toUpperCase() !== input.accountCurrency.toUpperCase(),
  );

  if (input.mode === 'transfer' && transferCrossCurrencySelection) {
    const amountIn = input.transferAmountIn.trim();

    if (!amountIn || Number.isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      errors.transferAmountIn = 'Enter a valid destination amount greater than 0.';
    }

    if (input.transferFxMode === 'auto_destination') {
      const fxRate = input.transferFxRate.trim();
      if (!fxRate || Number.isNaN(Number(fxRate)) || Number(fxRate) <= 0) {
        errors.transferFxRate = 'Enter a valid FX rate greater than 0.';
      }
    }
  }

  if ((input.mode === 'expense' || input.mode === 'income') && input.expenseDetailed) {
    if (input.expenseItemsLength === 0) {
      errors.expenseSplit = 'Add at least one item before publishing.';
    }
    if (parseAmount(input.expenseRemaining) !== 0) {
      errors.expenseSplit = 'Items must match the total amount before publishing.';
    }
  }

  if (input.recurrenceEnabled) {
    const interval = Number(input.recurrenceInterval.trim());
    if (!Number.isFinite(interval) || interval <= 0 || !Number.isInteger(interval)) {
      errors.recurrenceInterval = 'Recurrence interval must be a positive integer.';
    }
    if (input.recurrenceEndKind === 'on_date' && !input.recurrenceEndDate.trim()) {
      errors.recurrenceEndDate = 'Recurrence end date is required.';
    }
    if (input.recurrenceEndKind === 'after_occurrences') {
      const count = Number(input.recurrenceEndCount.trim());
      if (!Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
        errors.recurrenceEndCount = 'Recurrence count must be a positive integer.';
      }
    }
  }

  return {
    errors,
    resolvedTransactionDate,
    movementExpected,
    movementScheduled,
    transferCrossCurrencySelection,
  };
}
