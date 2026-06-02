import { describe, expect, it } from 'vitest';
import { nextRecurrenceDateIso } from './nextRecurrenceDate';

describe('nextRecurrenceDateIso', () => {
  it('returns the nearest monthly occurrence instead of reusing an unrelated manual date', () => {
    expect(nextRecurrenceDateIso({
      fromDate: '2026-05-18',
      frequency: 'monthly',
      interval: '1',
      weeklyDay: '1',
      monthlyPattern: 'day_of_month',
      dayOfMonth: '11',
      monthlyOrdinal: '1',
      monthlyWeekday: '1',
    })).toBe('2026-06-11');
  });

  it('returns the nearest weekly occurrence and respects the interval after the weekday has passed', () => {
    expect(nextRecurrenceDateIso({
      fromDate: '2026-05-18',
      frequency: 'weekly',
      interval: '2',
      weeklyDay: '5',
      monthlyPattern: 'day_of_month',
      dayOfMonth: '18',
      monthlyOrdinal: '1',
      monthlyWeekday: '1',
    })).toBe('2026-05-22');

    expect(nextRecurrenceDateIso({
      fromDate: '2026-05-23',
      frequency: 'weekly',
      interval: '2',
      weeklyDay: '5',
      monthlyPattern: 'day_of_month',
      dayOfMonth: '18',
      monthlyOrdinal: '1',
      monthlyWeekday: '1',
    })).toBe('2026-06-05');
  });

  it('clamps monthly dates to the final valid day of shorter months', () => {
    expect(nextRecurrenceDateIso({
      fromDate: '2026-02-01',
      frequency: 'monthly',
      interval: '1',
      weeklyDay: '7',
      monthlyPattern: 'day_of_month',
      dayOfMonth: '31',
      monthlyOrdinal: '1',
      monthlyWeekday: '7',
    })).toBe('2026-02-28');
  });
});
