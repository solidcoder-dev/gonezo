import { describe, expect, it } from 'vitest';
import { createFinancialFact } from './financialFact';
import { accountBalanceCutoffForPeriod, analyticsPeriodForFact, createAnalyticsPeriod } from './analyticsPeriod';

describe('AnalyticsPeriod', () => {
  it.each(['2026-01', '2026-09', '2026-12', '2027-12'])('accepts canonical year-month %s', (value) => {
    expect(createAnalyticsPeriod(value).value).toBe(value);
  });

  it.each(['2026-00', '2026-13', '26-09', '0000-01', '2026-1'])('rejects malformed year-month %s', (value) => {
    expect(() => createAnalyticsPeriod(value)).toThrow();
  });

  it.each([['2026-09', '2026-10-01'], ['2026-12', '2027-01-01']])('uses the period end cutoff for %s', (period, cutoff) => {
    expect(accountBalanceCutoffForPeriod(createAnalyticsPeriod(period))).toBe(cutoff);
  });

  it('derives a stable month in the supplied timezone', () => {
    const fact = createFinancialFact({
      id: 'fact-1',
      occurredAt: '2026-01-01T00:30:00+02:00',
      source: 'POSTED',
      kind: 'EXPENSE',
      amount: '12.34',
      currency: 'GBP',
    });

    expect(analyticsPeriodForFact(fact, 'UTC').value).toBe('2025-12');
    expect(analyticsPeriodForFact(fact, 'Europe/Helsinki').value).toBe('2026-01');
    expect(analyticsPeriodForFact(fact, 'UTC').value).toBe('2025-12');
  });
});
