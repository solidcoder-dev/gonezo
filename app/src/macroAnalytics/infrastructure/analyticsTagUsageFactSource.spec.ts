import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsListMovementFactsResult, AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsTagUsageFactSource } from './analyticsTagUsageFactSource';

describe('Analytics TagUsageFact source', () => {
  it('uses the existing movement query boundary and returns privacy-reduced economic facts', async () => {
    const analyticsListMovementFacts = vi.fn(async (): Promise<AnalyticsListMovementFactsResult> => ({
      items: [movement({ tags: [{ key: 'tag:private', tagId: 'private', displayName: 'Holiday' }] })],
    }));
    const source = createAnalyticsTagUsageFactSource({ analyticsListMovementFacts });

    const facts = await source.listTagUsageFacts({
      period: createAnalyticsPeriod('2026-09'), timeZone: 'Europe/London', currency: 'EUR',
    });

    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '2026-09-01', toLocalDate: '2026-09-30', zoneId: 'Europe/London', currency: 'EUR',
      includePlannedMovements: true, includeIgnoredMovements: false,
    });
    expect(facts).toEqual([{
      id: 'occurrence-1/tag-usage', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED', kind: 'EXPENSE',
      currency: 'EUR', amount: '60.00', tagCount: 1,
    }]);
  });

  it('uses the Analytics-selected lifecycle source and its tag count as authoritative', async () => {
    const selectedPosted = movement({ source: 'POSTED', tags: [
      { key: 'tag:a', tagId: 'a', displayName: 'A' },
      { key: 'tag:b', tagId: 'b', displayName: 'B' },
      { key: 'tag:c', tagId: 'c', displayName: 'C' },
    ] });
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [selectedPosted] }));
    const source = createAnalyticsTagUsageFactSource({ analyticsListMovementFacts });

    await expect(source.listTagUsageFacts({ period: createAnalyticsPeriod('2026-09'), timeZone: 'UTC' })).resolves.toMatchObject([
      { id: 'occurrence-1/tag-usage', source: 'POSTED', tagCount: 3 },
    ]);
  });
});

function movement(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'occurrence-1', reference: { source: 'posted', transactionId: 'transaction-1' },
    source: 'POSTED', effectiveAt: '2026-09-18T10:30:00Z', accountId: 'account-1', type: 'expense',
    currency: 'EUR', personalAmount: '60.00', fullAmount: '100.00', ignored: false,
    categoryAllocations: [], tagIds: [], tags: [], ...overrides,
  };
}
