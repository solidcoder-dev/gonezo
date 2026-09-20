import { describe, expect, it } from 'vitest';
import { createRecurringFact } from './recurringFact';

describe('createRecurringFact', () => {
  it('creates a minimal privacy-safe analytical fact', () => {
    expect(createRecurringFact({
      id: 'occurrence/1/recurring',
      occurredAt: '2026-09-18T10:30:00Z',
      source: 'POSTED',
      kind: 'EXPENSE',
      currency: 'EUR',
      amount: '60.00',
      seriesId: 'series/local-1',
    })).toEqual({
      id: 'occurrence/1/recurring',
      occurredAt: '2026-09-18T10:30:00Z',
      source: 'POSTED',
      kind: 'EXPENSE',
      currency: 'EUR',
      amount: '60.00',
      seriesId: 'series/local-1',
    });
  });

  it('rejects an amount that is not a positive decimal', () => {
    expect(() => createRecurringFact({
      id: 'fact', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED',
      kind: 'EXPENSE', currency: 'EUR', amount: '0', seriesId: 'series/local',
    })).toThrow('Recurring fact amount must be a positive decimal string');
  });
});
