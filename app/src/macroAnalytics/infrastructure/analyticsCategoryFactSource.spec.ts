import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsCategoryFactSource } from './analyticsCategoryFactSource';

const fact = (overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem => ({
  analyticsFactId: 'posted/movement-1', reference: { source: 'posted', transactionId: 'movement-1' },
  source: 'POSTED', effectiveAt: '2026-09-18T10:30:00Z', accountId: 'private-account',
  type: 'expense', currency: 'EUR', personalAmount: '5.00', fullAmount: '8.00', ignored: false,
  categoryId: 'personal-category', tagIds: [],
  categoryAllocations: [
    { categoryId: '00000000-0000-4000-8000-000000000102', personalAmount: '2.50', fullAmount: '4.00' },
    { personalAmount: '2.50', fullAmount: '4.00' },
  ],
  ...overrides,
});

describe('createAnalyticsCategoryFactSource', () => {
  it('maps allocations to deterministic privacy-safe macro facts and reconciles personal amount', async () => {
    const source = createAnalyticsCategoryFactSource({ analyticsListMovementFacts: vi.fn(async () => ({ items: [fact()] })) });
    const query = { period: { kind: 'YEAR_MONTH', value: '2026-09' } as const, timeZone: 'Europe/London' };

    const first = await source.listCategoryFacts(query);
    const second = await source.listCategoryFacts(query);

    expect(first).toEqual(second);
    expect(first.map(({ category, amount, id }) => [category, amount, id])).toEqual([
      ['GROCERIES', '2.50', 'posted/movement-1/category/0'],
      ['UNMAPPED_EXPENSE', '2.50', 'posted/movement-1/category/1'],
    ]);
    expect(first.reduce((sum, item) => sum + Number(item.amount), 0)).toBe(5);
    expect(JSON.stringify(first)).not.toContain('personal-category');
    expect(JSON.stringify(first)).not.toContain('private-account');
  });

  it('omits ignored movements and transfers', async () => {
    const source = createAnalyticsCategoryFactSource({ analyticsListMovementFacts: vi.fn(async () => ({ items: [
      fact({ ignored: true }), fact({ analyticsFactId: 'transfer', type: 'transfer_out' }),
    ] })) });
    await expect(source.listCategoryFacts({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'UTC' })).resolves.toEqual([]);
  });
});
