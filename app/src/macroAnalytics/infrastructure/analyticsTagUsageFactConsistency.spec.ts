import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsFinancialFactSource } from './analyticsFinancialFactSource';
import { createAnalyticsTagUsageFactSource } from './analyticsTagUsageFactSource';

describe('FinancialFact and TagUsageFact consistency', () => {
  it('uses the same personal amount without changing shared expense attribution', async () => {
    const movement: AnalyticsMovementFactItem = {
      analyticsFactId: 'shared-expense', reference: { source: 'posted', transactionId: 'transaction' },
      source: 'POSTED', effectiveAt: '2026-09-18T10:30:00Z', accountId: 'account', type: 'expense',
      currency: 'EUR', personalAmount: '60', fullAmount: '100', ignored: false, categoryAllocations: [],
      tagIds: ['tag-a', 'tag-b'], tags: [
        { key: 'tag:tag-a', tagId: 'tag-a', displayName: 'Family' },
        { key: 'tag:tag-b', tagId: 'tag-b', displayName: 'Holiday' },
      ],
    };
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [movement] }));
    const query = { period: { value: '2026-09' } as never, timeZone: 'UTC' };

    const [financialFacts, tagUsageFacts] = await Promise.all([
      createAnalyticsFinancialFactSource({ analyticsListMovementFacts }).listFinancialFacts(query),
      createAnalyticsTagUsageFactSource({ analyticsListMovementFacts }).listTagUsageFacts(query),
    ]);
    const [financialFact] = financialFacts;
    const [tagUsageFact] = tagUsageFacts;

    expect(financialFact).toMatchObject({ id: 'shared-expense', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '60' });
    expect(tagUsageFact).toMatchObject({ id: 'shared-expense/tag-usage', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '60', tagCount: 2 });
    expect(tagUsageFact.amount).toBe(financialFact.amount);
    expect(analyticsListMovementFacts).toHaveBeenCalledTimes(2);
  });
});
