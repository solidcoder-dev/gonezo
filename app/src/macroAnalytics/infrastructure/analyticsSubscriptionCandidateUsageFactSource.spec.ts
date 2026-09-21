import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsSubscriptionCandidateUsageFactSource } from './analyticsSubscriptionCandidateUsageFactSource';

const candidate = {
  analyticsFactId: 'fact-one', reference: { source: 'posted' as const, transactionId: 'transaction' }, source: 'POSTED' as const,
  schedulingOrigin: { kind: 'recurring' as const, recurringMovementId: 'private-series', cadence: { frequency: 'monthly' as const, interval: 1 } },
  effectiveAt: '2026-09-18T10:30:00Z', accountId: 'account', type: 'expense' as const, currency: 'EUR',
  personalAmount: '10.00', fullAmount: '10.00', ignored: false, categoryAllocations: [], tagIds: [], tags: [],
  merchant: { key: 'private-merchant', displayName: 'Private Merchant' }, subscriptionCandidateStatus: 'CANDIDATE' as const,
} satisfies AnalyticsMovementFactItem;

describe('createAnalyticsSubscriptionCandidateUsageFactSource', () => {
  it('applies the period and currency query and returns only privacy-reduced facts', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [candidate] }));
    const source = createAnalyticsSubscriptionCandidateUsageFactSource({ analyticsListMovementFacts });

    const facts = await source.listSubscriptionCandidateUsageFacts({
      period: createAnalyticsPeriod('2026-09'), timeZone: 'Europe/London', currency: 'EUR',
    });

    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '2026-09-01', toLocalDate: '2026-09-30', zoneId: 'Europe/London',
      currency: 'EUR', includePlannedMovements: true, includeIgnoredMovements: false,
    });
    expect(facts).toEqual([{
      id: 'fact-one/subscription-candidate', occurredAt: candidate.effectiveAt, source: 'POSTED',
      currency: 'EUR', amount: '10.00', status: 'CANDIDATE',
    }]);
  });
});
