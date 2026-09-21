import { describe, expect, it } from 'vitest';
import { aggregateTagUsageFacts } from './tagUsageContribution';
import { createTagUsageFact } from './tagUsageFact';

function fact(id: string, overrides: Partial<Parameters<typeof createTagUsageFact>[0]> = {}) {
  return createTagUsageFact({
    id,
    occurredAt: '2026-09-18T10:30:00Z',
    source: 'POSTED',
    kind: 'EXPENSE',
    currency: 'EUR',
    amount: '0',
    tagCount: 0,
    ...overrides,
  });
}

describe('aggregateTagUsageFacts', () => {
  it('aggregates every movement once and distinguishes tagged amounts without multiplying by tag count', () => {
    const contribution = aggregateTagUsageFacts([
      fact('untagged', { amount: '0.10' }),
      fact('tagged', { amount: '100.20', tagCount: 3 }),
      fact('zero-tagged', { tagCount: 1 }),
    ]);

    expect(contribution.currencies).toEqual([{
      currency: 'EUR',
      buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '100.3', movementCount: 3, taggedAmount: '100.2', taggedMovementCount: 2 }],
    }]);
    expect(JSON.stringify(contribution)).not.toMatch(/tagCount|tagId|tag key|tag name|displayName|hash/i);
  });

  it('separates currency, source, and kind in deterministic order', () => {
    const contribution = aggregateTagUsageFacts([
      fact('z', { currency: 'USD', source: 'SCHEDULED', kind: 'INCOME', amount: '2', tagCount: 1 }),
      fact('y', { source: 'EXPECTED', kind: 'INCOME', amount: '3' }),
      fact('x', { source: 'POSTED', amount: '1' }),
      fact('w', { source: 'POSTED', kind: 'INCOME', amount: '4' }),
    ]);

    expect(contribution.currencies.map(({ currency }) => currency)).toEqual(['EUR', 'USD']);
    expect(contribution.currencies[0].buckets.map(({ source, kind }) => [source, kind])).toEqual([
      ['EXPECTED', 'INCOME'], ['POSTED', 'EXPENSE'], ['POSTED', 'INCOME'],
    ]);
    expect(contribution.currencies[1].buckets[0]).toMatchObject({ amount: '2', movementCount: 1, taggedAmount: '2', taggedMovementCount: 1 });
  });
});
