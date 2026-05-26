import { describe, expect, it } from 'vitest';
import {
  firstDueAtForWebRecurrence,
  normalizeWebRecurrenceEnd,
  normalizeWebRecurrenceRule,
} from './coreAdapterWebRecurrence';

describe('coreAdapterWebRecurrence', () => {
  it('normalizes recurrence rules and rejects invalid weekly rules', () => {
    expect(normalizeWebRecurrenceRule({
      frequency: 'weekly',
      interval: 0,
      weeklyDays: [3, 3, 8, 1],
    })).toEqual({
      frequency: 'weekly',
      interval: 1,
      weeklyDays: [3, 1],
    });

    expect(() => normalizeWebRecurrenceRule({
      frequency: 'weekly',
      weeklyDays: [],
    })).toThrow('Weekly recurrence requires at least one weekday');
  });

  it('normalizes recurrence end variants', () => {
    expect(normalizeWebRecurrenceEnd({ kind: 'never' })).toEqual({ kind: 'never' });
    expect(normalizeWebRecurrenceEnd({ kind: 'on_date', onDate: '2026-01-31' })).toEqual({
      kind: 'on_date',
      onDate: '2026-01-31',
    });
    expect(normalizeWebRecurrenceEnd({ kind: 'after_occurrences', afterOccurrences: 3 })).toEqual({
      kind: 'after_occurrences',
      afterOccurrences: 3,
    });
  });

  it('calculates first due date for weekly and monthly rules', () => {
    expect(firstDueAtForWebRecurrence({
      startAt: '2026-01-14T10:00:00.000Z',
      zoneId: 'UTC',
      rule: { frequency: 'weekly', interval: 1, weeklyDays: [1, 5] },
      recurrenceEnd: { kind: 'never' },
    })).toBe('2026-01-16T10:00:00.000Z');

    expect(firstDueAtForWebRecurrence({
      startAt: '2026-01-20T10:00:00.000Z',
      zoneId: 'UTC',
      rule: {
        frequency: 'monthly',
        interval: 1,
        monthlyPattern: 'nth_weekday',
        monthlyWeekOrdinal: 2,
        monthlyWeekday: 1,
      },
      recurrenceEnd: { kind: 'never' },
    })).toBe('2026-02-09T10:00:00.000Z');
  });

  it('returns no due date after an on-date recurrence end', () => {
    expect(firstDueAtForWebRecurrence({
      startAt: '2026-02-01T10:00:00.000Z',
      zoneId: 'UTC',
      rule: { frequency: 'daily', interval: 1 },
      recurrenceEnd: { kind: 'on_date', onDate: '2026-01-31' },
    })).toBeUndefined();
  });
});
