import { describe, expect, it } from 'vitest';
import { aggregateCategoryFacts } from './categoryContribution';
import type { CategoryFact } from './categoryFact';

const fact = (values: Partial<CategoryFact> = {}): CategoryFact => ({
  id: 'private', occurredAt: '2026-09-01T00:00:00Z', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '0.10', category: 'GROCERIES', ...values,
});

describe('aggregateCategoryFacts', () => {
  it('aggregates sparse category buckets exactly and orders every dimension', () => {
    expect(aggregateCategoryFacts([
      fact({ amount: '0.10' }), fact({ amount: '0.20' }), fact({ currency: 'USD', category: 'DINING' }),
      fact({ source: 'EXPECTED', category: 'UNMAPPED_EXPENSE' }), fact({ source: 'SCHEDULED', kind: 'INCOME', category: 'OTHER_INCOME' }),
    ])).toEqual({ currencies: [
      { currency: 'EUR', buckets: [
        { source: 'EXPECTED', kind: 'EXPENSE', category: 'UNMAPPED_EXPENSE', amount: '0.1' },
        { source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '0.3' },
        { source: 'SCHEDULED', kind: 'INCOME', category: 'OTHER_INCOME', amount: '0.1' },
      ] },
      { currency: 'USD', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'DINING', amount: '0.1' }] },
    ] });
  });

  it('returns an empty contribution for no facts and removes zero totals', () => {
    expect(aggregateCategoryFacts([])).toEqual({ currencies: [] });
    expect(aggregateCategoryFacts([fact({ amount: '1' }), fact({ amount: '-1' })])).toEqual({ currencies: [{ currency: 'EUR', buckets: [] }] });
  });
});
