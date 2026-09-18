import { describe, expect, it } from 'vitest';
import { createFinancialFact } from './financialFact';
import { aggregateFinancialFacts } from './financialContribution';

function fact(id: string, source: 'POSTED' | 'EXPECTED' | 'SCHEDULED', kind: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT', amount: string, currency = 'EUR') {
  return createFinancialFact({ id, occurredAt: '2026-09-01T12:00:00Z', source, kind, amount, currency });
}

describe('macro analytics financial contribution', () => {
  it('sums decimal strings exactly and counts contributing facts', () => {
    const summary = aggregateFinancialFacts([
      fact('a', 'POSTED', 'EXPENSE', '0.10'),
      fact('b', 'POSTED', 'EXPENSE', '0.20'),
      fact('c', 'POSTED', 'EXPENSE', '10.005'),
    ]);
    expect(summary.currencies[0].buckets).toEqual([{ source: 'POSTED', kind: 'EXPENSE', amount: '10.305', count: 3 }]);
    expect(aggregateFinancialFacts([
      fact('d', 'POSTED', 'INCOME', '1.005'),
      fact('e', 'POSTED', 'INCOME', '2.01'),
    ]).currencies[0].buckets[0].amount).toBe('3.015');
  });

  it('keeps currency, source, and kind buckets separate in canonical order', () => {
    const facts = [
      fact('a', 'POSTED', 'EXPENSE', '100'),
      fact('b', 'EXPECTED', 'EXPENSE', '50'),
      fact('c', 'SCHEDULED', 'EXPENSE', '75'),
      fact('d', 'POSTED', 'INCOME', '10'),
      fact('e', 'POSTED', 'TRANSFER_IN', '11'),
      fact('f', 'POSTED', 'TRANSFER_OUT', '12'),
      fact('g', 'POSTED', 'EXPENSE', '50', 'GBP'),
    ];
    expect(aggregateFinancialFacts(facts)).toEqual({ currencies: [
      { currency: 'EUR', buckets: [
        { source: 'POSTED', kind: 'INCOME', amount: '10', count: 1 },
        { source: 'POSTED', kind: 'EXPENSE', amount: '100', count: 1 },
        { source: 'POSTED', kind: 'TRANSFER_IN', amount: '11', count: 1 },
        { source: 'POSTED', kind: 'TRANSFER_OUT', amount: '12', count: 1 },
        { source: 'EXPECTED', kind: 'EXPENSE', amount: '50', count: 1 },
        { source: 'SCHEDULED', kind: 'EXPENSE', amount: '75', count: 1 },
      ] },
      { currency: 'GBP', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '50', count: 1 }] },
    ] });
  });

  it('returns no currency summaries when there are no facts', () => {
    expect(aggregateFinancialFacts([])).toEqual({ currencies: [] });
  });
});
