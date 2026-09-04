import { describe, expect, it } from 'vitest';
import {
  groupMovementReuseSuggestions,
  listMovementReuseVariants,
  normalizeMovementReuseTitle,
  type MovementReuseCandidate,
} from './movementReuseSuggestions';

function candidate(overrides: Partial<MovementReuseCandidate> = {}): MovementReuseCandidate {
  return {
    id: 'movement-1',
    title: 'Mercadona',
    accountId: 'main',
    accountName: 'Main',
    type: 'expense',
    categoryId: 'groceries',
    categoryName: 'Groceries',
    tagIds: ['food'],
    itemNames: [],
    sharePersonIds: [],
    lastUsedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('movement reuse title normalization', () => {
  it('groups whitespace, case and diacritics consistently', () => {
    expect(normalizeMovementReuseTitle(' Mercadona ')).toBe(normalizeMovementReuseTitle('MERCADONA'));
    expect(normalizeMovementReuseTitle('Café')).toBe('cafe');
    expect(groupMovementReuseSuggestions([candidate({ title: ' Mercadona ' })], 'dona')).toHaveLength(1);
    expect(groupMovementReuseSuggestions([candidate({ title: 'Café' })], 'CAFE')).toHaveLength(1);
  });
});

describe('movement reuse variant ranking', () => {
  it('ranks unique variants by usage, recency and deterministic key', () => {
    const candidates = [
      ...Array.from({ length: 7 }, (_, index) => candidate({ id: `main-${index}`, accountId: 'main', accountName: 'Main' })),
      ...Array.from({ length: 3 }, (_, index) => candidate({ id: `revolut-${index}`, accountId: 'revolut', accountName: 'Revolut' })),
      candidate({ id: 'cash-1', accountId: 'cash', accountName: 'Cash' }),
    ];
    const [group] = groupMovementReuseSuggestions(candidates, 'merc');
    expect(group).toMatchObject({ title: 'Mercadona', variantCount: 3 });
    expect(group.primaryVariant).toMatchObject({ accountName: 'Main', usageCount: 7 });
    expect(listMovementReuseVariants(candidates, 'mercadona').map((item) => item.accountName)).toEqual(['Main', 'Revolut', 'Cash']);
  });

  it('uses latest use as the tie breaker and does not depend on persistence order', () => {
    const candidates = [
      candidate({ id: 'z', accountId: 'z', accountName: 'Z', lastUsedAt: '2026-02-01T00:00:00Z' }),
      candidate({ id: 'a', accountId: 'a', accountName: 'A', lastUsedAt: '2026-03-01T00:00:00Z' }),
    ];
    expect(groupMovementReuseSuggestions(candidates, 'merc')[0].primaryVariant.accountName).toBe('A');
    expect(groupMovementReuseSuggestions([...candidates].reverse(), 'merc')[0].primaryVariant.accountName).toBe('A');
  });

  it('ranks exact, prefix and contained titles in that order', () => {
    const candidates = [
      candidate({ title: 'Super Mercadona', id: 'contained' }),
      candidate({ title: 'Mercadona Express', id: 'prefix' }),
      candidate({ title: 'Merc', id: 'exact' }),
    ];
    expect(groupMovementReuseSuggestions(candidates, 'merc').map((group) => group.title)).toEqual([
      'Merc', 'Mercadona Express', 'Super Mercadona',
    ]);
  });
});
