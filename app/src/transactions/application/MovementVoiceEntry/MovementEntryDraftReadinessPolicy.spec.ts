import { describe, expect, it } from 'vitest';
import { MovementEntryDraftReadinessPolicy } from './MovementEntryDraftReadinessPolicy';

describe('MovementEntryDraftReadinessPolicy', () => {
  const policy = new MovementEntryDraftReadinessPolicy();

  it('accepts a draft with valid type and amount', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '12.50',
      issues: [],
    })).toEqual({ kind: 'ready' });
  });

  it('rejects a draft without type', () => {
    expect(policy.evaluate({
      amount: '12.50',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['type'],
    });
  });

  it('rejects a draft without amount', () => {
    expect(policy.evaluate({
      type: 'income',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['amount'],
    });
  });

  it('rejects a draft without type or amount', () => {
    expect(policy.evaluate({
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['type', 'amount'],
    });
  });

  it('rejects an empty amount', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '   ',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['amount'],
    });
  });

  it('rejects a zero amount', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '0',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['amount'],
    });
  });

  it('rejects a negative amount', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '-1',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['amount'],
    });
  });

  it('rejects a non-numeric amount', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: 'five',
      issues: [],
    })).toEqual({
      kind: 'incomplete',
      missingFields: ['amount'],
    });
  });

  it('accepts a draft without a date', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '10',
      note: 'Coffee',
      categoryId: 'cat-coffee',
      issues: [],
    })).toEqual({ kind: 'ready' });
  });

  it('accepts a draft without a note', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '10',
      occurredOn: '2026-07-15',
      categoryId: 'cat-coffee',
      issues: [],
    })).toEqual({ kind: 'ready' });
  });

  it('accepts a draft without a category', () => {
    expect(policy.evaluate({
      type: 'expense',
      amount: '10',
      occurredOn: '2026-07-15',
      note: 'Coffee',
      issues: [],
    })).toEqual({ kind: 'ready' });
  });
});
