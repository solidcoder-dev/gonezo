import { describe, expect, it } from 'vitest';
import { validateTransactionComposerSubmission } from './transactionComposerValidation';

const baseInput = {
  accountId: 'acc-1',
  mode: 'expense' as const,
  amount: '10.00',
  transactionDate: '2026-05-14',
  schedulingMode: 'now' as const,
  recurrenceEnabled: false,
  expectedMovement: false,
  editedExpectedMovementId: '',
  editedScheduledMovementId: '',
  postExpectedMovementId: '',
  transferToAccountId: '',
  accountCurrency: 'USD',
  transferAmountIn: '',
  transferFxRate: '1',
  transferFxMode: 'auto_destination' as const,
  expenseDetailed: false,
  expenseItemsLength: 0,
  recurrenceInterval: '1',
  recurrenceEndKind: 'never' as const,
  recurrenceEndDate: '',
  recurrenceEndCount: '12',
  todayIso: '2026-05-14',
  nowMs: new Date('2026-05-14T12:00:00Z').getTime(),
};

describe('transaction composer validation', () => {
  it('returns field errors for invalid amount, items and recurrence inputs', () => {
    const result = validateTransactionComposerSubmission({
      ...baseInput,
      amount: '',
      recurrenceEnabled: true,
      recurrenceInterval: '0',
      recurrenceEndKind: 'after_occurrences',
      recurrenceEndCount: '0',
      expenseDetailed: true,
      expenseItemsLength: 0,
    });

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual({
      amount: 'Enter a valid amount greater than 0.',
      expenseSplit: 'Add at least one item before publishing.',
      recurrenceInterval: 'Recurrence interval must be a positive integer.',
      recurrenceEndCount: 'Recurrence count must be a positive integer.',
    });
  });

  it('detects expected and scheduled movement intent', () => {
    const expected = validateTransactionComposerSubmission({
      ...baseInput,
      expectedMovement: true,
    });
    const scheduled = validateTransactionComposerSubmission({
      ...baseInput,
      expectedMovement: false,
      transactionDate: '2026-06-01',
    });

    expect(expected.movementExpected).toBe(true);
    expect(expected.movementScheduled).toBe(false);
    expect(scheduled.movementExpected).toBe(false);
    expect(scheduled.movementScheduled).toBe(true);
  });

  it('returns blocking transfer errors before field errors', () => {
    const result = validateTransactionComposerSubmission({
      ...baseInput,
      mode: 'transfer',
      transferToAccountId: '',
    });

    expect(result.blockingError).toBe('Select a destination account for transfer.');
  });

  it('validates cross-currency transfer destination amount and FX rate', () => {
    const result = validateTransactionComposerSubmission({
      ...baseInput,
      mode: 'transfer',
      transferToAccountId: 'acc-2',
      transferTarget: { id: 'acc-2', currency: 'EUR' },
      transferAmountIn: '',
      transferFxRate: '',
      transferFxMode: 'auto_destination',
    });

    expect(result.transferCrossCurrencySelection).toBe(true);
    expect(result.errors).toMatchObject({
      transferAmountIn: 'Enter a valid destination amount greater than 0.',
      transferFxRate: 'Enter a valid FX rate greater than 0.',
    });
  });

  it('rejects future manual income dates and past scheduled dates', () => {
    const manual = validateTransactionComposerSubmission({
      ...baseInput,
      mode: 'income',
      transactionDate: '2026-05-15',
    });
    const scheduled = validateTransactionComposerSubmission({
      ...baseInput,
      mode: 'income',
      schedulingMode: 'scheduled',
      transactionDate: '2026-05-13',
    });

    expect(manual.errors.date).toBe('Manual movements cannot use a future date.');
    expect(scheduled.errors.date).toBe('Scheduled movements must use today or a future date.');
  });
});
