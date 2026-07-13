import { describe, expect, it } from 'vitest';
import { mapMovementEntryDraftToTransactionEntryPrefill } from './mapMovementEntryDraftToTransactionEntryPrefill';

describe('mapMovementEntryDraftToTransactionEntryPrefill', () => {
  it('maps a reviewed voice draft into the existing composer prefill request', () => {
    const prefill = mapMovementEntryDraftToTransactionEntryPrefill({
      type: 'income',
      amount: '1200.00',
      occurredOn: '2026-07-14',
      note: 'Salary',
      categoryId: 'cat-salary',
      issues: [],
    }, {
      requestId: 42,
      defaultDate: '2026-07-14',
    });

    expect(prefill).toEqual({
      requestId: 42,
      mode: 'income',
      amount: '1200.00',
      date: '2026-07-14',
      note: 'Salary',
      categoryId: 'cat-salary',
    });
  });

  it('keeps missing fields editable and preserves the composer default mode', () => {
    const prefill = mapMovementEntryDraftToTransactionEntryPrefill({
      issues: [],
    }, {
      requestId: 7,
      defaultDate: '2026-07-14',
    });

    expect(prefill).toEqual({
      requestId: 7,
      mode: 'expense',
      amount: '',
      date: '2026-07-14',
      note: undefined,
      categoryId: undefined,
    });
  });
});
