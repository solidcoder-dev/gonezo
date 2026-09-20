import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsListMovementFactsResult, AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsRecurringFactSource } from './analyticsRecurringFactSource';

function sourceFact(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'fact-1',
    reference: { source: 'posted', transactionId: 'transaction-private' },
    source: 'POSTED',
    schedulingOrigin: { kind: 'recurring', recurringMovementId: 'series-private', occurrenceId: 'occurrence-1' },
    effectiveAt: '2026-09-18T10:30:00Z',
    accountId: 'account-private',
    type: 'expense',
    currency: 'EUR',
    personalAmount: '60.00',
    fullAmount: '100.00',
    ignored: false,
    categoryId: 'category-private',
    categoryAllocations: [],
    tagIds: ['tag-private'],
    ...overrides,
  };
}

describe('createAnalyticsRecurringFactSource', () => {
  it('maps income, expense, and all three analytical sources using personal amounts', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({
      items: [
        sourceFact(),
        sourceFact({
          analyticsFactId: 'fact-expected', source: 'EXPECTED', type: 'income', personalAmount: '25.00',
          reference: { source: 'expected', expectedMovementId: 'expected-private', recurringMovementId: 'series-private', occurrenceId: 'occurrence-2' },
        }),
        sourceFact({
          analyticsFactId: 'fact-scheduled', source: 'SCHEDULED_PROJECTION',
          reference: { source: 'scheduledProjection', recurringMovementId: 'series-private', occurrenceId: 'occurrence-3' },
        }),
        sourceFact({ analyticsFactId: 'one-shot', schedulingOrigin: { kind: 'one_shot', recurringMovementId: 'series-one-shot' } }),
        sourceFact({ analyticsFactId: 'transfer', type: 'transfer_out' }),
        sourceFact({ analyticsFactId: 'ignored', ignored: true }),
      ],
    } satisfies AnalyticsListMovementFactsResult));
    const source = createAnalyticsRecurringFactSource({ analyticsListMovementFacts });

    const facts = await source.listRecurringFacts({
      period: createAnalyticsPeriod('2026-09'), timeZone: 'Europe/Madrid', currency: 'EUR',
    });

    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '2026-09-01', toLocalDate: '2026-09-30', zoneId: 'Europe/Madrid',
      currency: 'EUR', includePlannedMovements: true, includeIgnoredMovements: false,
    });
    expect(facts).toEqual([
      { id: 'fact-1/recurring', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '60.00', seriesId: 'series/series-private' },
      { id: 'fact-expected/recurring', occurredAt: '2026-09-18T10:30:00Z', source: 'EXPECTED', kind: 'INCOME', currency: 'EUR', amount: '25.00', seriesId: 'series/series-private' },
      { id: 'fact-scheduled/recurring', occurredAt: '2026-09-18T10:30:00Z', source: 'SCHEDULED', kind: 'EXPENSE', currency: 'EUR', amount: '60.00', seriesId: 'series/series-private' },
    ]);
    expect(JSON.stringify(facts)).not.toMatch(/account|transaction|merchant|description|category|tagIds|person/i);
  });

  it('preserves Analytics occurrence deduplication across scheduled to expected and expected to posted transitions', async () => {
    const selectedExpected = sourceFact({ analyticsFactId: 'occurrence/one' , source: 'EXPECTED' });
    const selectedPosted = sourceFact({ analyticsFactId: 'occurrence/two', source: 'POSTED' });
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [selectedExpected, selectedPosted] }));
    const source = createAnalyticsRecurringFactSource({ analyticsListMovementFacts });

    const facts = await source.listRecurringFacts({ period: createAnalyticsPeriod('2026-09'), timeZone: 'UTC' });

    expect(facts.map((fact) => fact.id)).toEqual(['occurrence/one/recurring', 'occurrence/two/recurring']);
    expect(facts).toHaveLength(2);
  });
});
