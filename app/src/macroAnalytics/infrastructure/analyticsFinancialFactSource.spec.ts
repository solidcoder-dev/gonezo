import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsListMovementFactsResult, AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsFinancialFactSource } from './analyticsFinancialFactSource';

function sourceFact(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'fact-1',
    reference: { source: 'posted', transactionId: 'transaction-1' },
    source: 'POSTED',
    effectiveAt: '2026-09-18T10:30:00Z',
    accountId: 'account-1',
    type: 'expense',
    currency: 'EUR',
    personalAmount: '60.00',
    fullAmount: '100.00',
    ignored: false,
    categoryId: 'category-1',
    categoryAllocations: [],
    tagIds: ['tag-1'],
    ...overrides,
  };
}

describe('createAnalyticsFinancialFactSource', () => {
  it('requests the month including planned facts and maps returned rows deterministically', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({
      items: [
        sourceFact(),
        sourceFact({
          analyticsFactId: 'fact-2',
          source: 'EXPECTED',
          reference: { source: 'expected', expectedMovementId: 'expected-1' },
          type: 'income',
          personalAmount: '25.00',
        }),
        sourceFact({
          analyticsFactId: 'fact-3',
          source: 'SCHEDULED_PROJECTION',
          reference: { source: 'scheduledProjection', recurringMovementId: 'recurring-1', occurrenceId: 'occurrence-1' },
          type: 'transfer_out',
        }),
        sourceFact({ analyticsFactId: 'ignored-fact', ignored: true }),
      ],
    } satisfies AnalyticsListMovementFactsResult));
    const source = createAnalyticsFinancialFactSource({ analyticsListMovementFacts });
    const query = { period: createAnalyticsPeriod('2026-09'), timeZone: 'Europe/Madrid', currency: 'EUR' };

    const firstResult = await source.listFinancialFacts(query);
    const secondResult = await source.listFinancialFacts(query);

    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '2026-09-01',
      toLocalDate: '2026-09-30',
      zoneId: 'Europe/Madrid',
      currency: 'EUR',
      includePlannedMovements: true,
      includeIgnoredMovements: false,
    });
    expect(firstResult).toEqual([
      { id: 'fact-1', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '60.00', currency: 'EUR' },
      { id: 'fact-2', occurredAt: '2026-09-18T10:30:00Z', source: 'EXPECTED', kind: 'INCOME', amount: '25.00', currency: 'EUR' },
      { id: 'fact-3', occurredAt: '2026-09-18T10:30:00Z', source: 'SCHEDULED', kind: 'TRANSFER_OUT', amount: '60.00', currency: 'EUR' },
    ]);
    expect(secondResult).toEqual(firstResult);
  });
});
