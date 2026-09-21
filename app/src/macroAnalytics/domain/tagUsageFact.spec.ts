import { describe, expect, it } from 'vitest';
import { createTagUsageFact } from './tagUsageFact';

const fact = {
  id: 'analytics-fact/tag-usage',
  occurredAt: '2026-09-18T10:30:00Z',
  source: 'POSTED' as const,
  kind: 'EXPENSE' as const,
  currency: 'EUR',
  amount: '0',
  tagCount: 0,
};

describe('createTagUsageFact', () => {
  it('creates an immutable privacy-reduced fact including zero amounts and no tags', () => {
    const result = createTagUsageFact(fact);

    expect(result).toEqual(fact);
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/tagId|name:|displayName|Trip/);
  });

  it.each([
    [{ amount: '-1' }, 'amount'],
    [{ tagCount: -1 }, 'tagCount'],
    [{ tagCount: Number.MAX_SAFE_INTEGER + 1 }, 'tagCount'],
    [{ currency: 'eur' }, 'currency'],
  ])('rejects invalid %s', (overrides, field) => {
    expect(() => createTagUsageFact({ ...fact, ...overrides })).toThrow(`Tag usage fact ${field}`);
  });
});
