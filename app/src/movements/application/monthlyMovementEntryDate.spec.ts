import { describe, expect, it } from 'vitest';
import { monthlyMovementEntryDate } from './monthlyMovementEntryDate';

describe('monthlyMovementEntryDate', () => {
  it('keeps the current local day in the selected month', () => {
    expect(monthlyMovementEntryDate('2023-07', new Date(2026, 8, 11))).toBe('2023-07-11');
  });

  it('clamps the day to February in a non-leap year', () => {
    expect(monthlyMovementEntryDate('2023-02', new Date(2026, 2, 31))).toBe('2023-02-28');
  });

  it('keeps February 29 in a leap year', () => {
    expect(monthlyMovementEntryDate('2024-02', new Date(2026, 2, 29))).toBe('2024-02-29');
  });

  it('uses the current month when it is selected', () => {
    expect(monthlyMovementEntryDate('2026-09', new Date(2026, 8, 11))).toBe('2026-09-11');
  });

  it('uses today when no month was selected', () => {
    expect(monthlyMovementEntryDate(undefined, new Date(2026, 8, 11))).toBe('2026-09-11');
  });
});
