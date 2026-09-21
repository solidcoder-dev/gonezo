import { describe, expect, it } from 'vitest';
import { periodsAffectedByBalanceChange } from './NativeFinancialDataChangeObserver';

describe('periodsAffectedByBalanceChange', () => {
  it('includes the changed month and every later month through the current period', () => {
    expect(periodsAffectedByBalanceChange('2026-01-18T12:00:00Z', '2026-03-20T12:00:00Z', 'UTC').map(({ value }) => value))
      .toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('preserves a future period without queuing intermediate months', () => {
    expect(periodsAffectedByBalanceChange('2027-05-01T00:00:00Z', '2026-09-01T00:00:00Z', 'UTC').map(({ value }) => value))
      .toEqual(['2027-05']);
  });
});
