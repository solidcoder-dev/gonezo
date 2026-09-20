import { describe, expect, it } from 'vitest';
import { createRecurringFact } from './recurringFact';
import { aggregateRecurringFacts } from './recurringContribution';

function fact(id: string, source: 'POSTED' | 'EXPECTED' | 'SCHEDULED', kind: 'INCOME' | 'EXPENSE', currency: string, amount: string, seriesId: string) {
  return createRecurringFact({ id, occurredAt: '2026-09-01T00:00:00Z', source, kind, currency, amount, seriesId });
}

describe('aggregateRecurringFacts', () => {
  it('aggregates exact amounts, occurrences, and bucket-local distinct series in deterministic order', () => {
    const facts = [
      fact('scheduled', 'SCHEDULED', 'EXPENSE', 'USD', '0', 'shared-series'),
      fact('expected', 'EXPECTED', 'INCOME', 'EUR', '1.20', 'income-series'),
      fact('posted-2', 'POSTED', 'EXPENSE', 'EUR', '0.02', 'series-b'),
      fact('posted-1', 'POSTED', 'EXPENSE', 'EUR', '0.1', 'series-a'),
      fact('posted-3', 'POSTED', 'EXPENSE', 'EUR', '0.003', 'series-a'),
      fact('expected-expense', 'EXPECTED', 'EXPENSE', 'EUR', '3', 'shared-series'),
    ];
    const result = aggregateRecurringFacts(facts);
    expect(result).toEqual({ currencies: [
      { currency: 'EUR', buckets: [
        { source: 'POSTED', kind: 'EXPENSE', amount: '0.123', occurrenceCount: 3, seriesCount: 2 },
        { source: 'EXPECTED', kind: 'INCOME', amount: '1.2', occurrenceCount: 1, seriesCount: 1 },
        { source: 'EXPECTED', kind: 'EXPENSE', amount: '3', occurrenceCount: 1, seriesCount: 1 },
      ] },
      { currency: 'USD', buckets: [{ source: 'SCHEDULED', kind: 'EXPENSE', amount: '0', occurrenceCount: 1, seriesCount: 1 }] },
    ] });
    expect(aggregateRecurringFacts([...facts].reverse())).toEqual(result);
    expect(JSON.stringify(result)).not.toContain('seriesId');
    expect(JSON.stringify(result)).not.toContain('shared-series');
  });

  it('returns no currencies for empty input', () => {
    expect(aggregateRecurringFacts([])).toEqual({ currencies: [] });
  });
});
