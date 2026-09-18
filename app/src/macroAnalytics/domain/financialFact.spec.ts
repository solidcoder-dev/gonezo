import { describe, expect, it } from 'vitest';
import { createFinancialFact } from './financialFact';

describe('FinancialFact', () => {
  it.each([
    { source: 'POSTED', kind: 'EXPENSE' },
    { source: 'EXPECTED', kind: 'INCOME' },
    { source: 'SCHEDULED', kind: 'TRANSFER_IN' },
    { source: 'POSTED', kind: 'TRANSFER_OUT' },
  ] as const)('preserves analytical source and kind: $source / $kind', ({ source, kind }) => {
    const fact = createFinancialFact({
      id: 'fact-1',
      occurredAt: '2026-09-18T10:30:00Z',
      source,
      kind,
      amount: '1200.005',
      currency: 'GBP',
    });

    expect(fact).toMatchObject({ source, kind, amount: '1200.005', currency: 'GBP' });
  });

  it('rejects malformed financial values', () => {
    expect(() => createFinancialFact({
      id: '',
      occurredAt: '2026-09-18',
      source: 'SCHEDULED',
      kind: 'EXPENSE',
      amount: '1.2e3',
      currency: 'gbp',
    })).toThrow();
  });
});
