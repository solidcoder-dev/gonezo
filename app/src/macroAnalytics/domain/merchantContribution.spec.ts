import { describe, expect, it } from 'vitest';
import { createMacroMerchantCode } from './macroMerchantCode';
import { createMerchantFact } from './merchantFact';
import { aggregateMerchantFacts } from './merchantContribution';

function fact(id: string, currency: string, source: 'POSTED' | 'EXPECTED' | 'SCHEDULED', kind: 'INCOME' | 'EXPENSE', merchant: string, amount: string) {
  return createMerchantFact({ id, occurredAt: '2026-09-18T10:30:00Z', currency, source, kind, merchant: createMacroMerchantCode(merchant), amount });
}

describe('aggregateMerchantFacts', () => {
  it('aggregates exact amounts and movement counts by currency, source, kind and canonical merchant', () => {
    const facts = [
      fact('a', 'EUR', 'POSTED', 'EXPENSE', 'MERCADONA', '0.10'),
      fact('b', 'EUR', 'POSTED', 'EXPENSE', 'MERCADONA', '0.20'),
      fact('c', 'EUR', 'POSTED', 'EXPENSE', 'UNMAPPED', '0'),
      fact('d', 'GBP', 'SCHEDULED', 'INCOME', 'LIDL', '4'),
      fact('e', 'EUR', 'EXPECTED', 'INCOME', 'CARREFOUR', '2'),
    ];
    expect(aggregateMerchantFacts(facts, 1)).toEqual({ catalogVersion: 1, currencies: [
      { currency: 'EUR', buckets: [
        { source: 'EXPECTED', kind: 'INCOME', merchant: 'CARREFOUR', amount: '2', movementCount: 1 },
        { source: 'POSTED', kind: 'EXPENSE', merchant: 'MERCADONA', amount: '0.3', movementCount: 2 },
        { source: 'POSTED', kind: 'EXPENSE', merchant: 'UNMAPPED', amount: '0', movementCount: 1 },
      ] },
      { currency: 'GBP', buckets: [{ source: 'SCHEDULED', kind: 'INCOME', merchant: 'LIDL', amount: '4', movementCount: 1 }] },
    ] });
  });

  it('keeps an empty catalog-versioned contribution when there are no facts', () => {
    expect(aggregateMerchantFacts([], 1)).toEqual({ catalogVersion: 1, currencies: [] });
  });

  it('rejects invalid catalog versions', () => {
    expect(() => aggregateMerchantFacts([], 0)).toThrow('positive integer');
  });
});
