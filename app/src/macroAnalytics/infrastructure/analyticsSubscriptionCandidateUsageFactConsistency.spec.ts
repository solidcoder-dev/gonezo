import { describe, expect, it } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { adaptAnalyticsRecurringFact } from './analyticsRecurringFactAdapter';
import { adaptAnalyticsSubscriptionCandidateUsageFact } from './analyticsSubscriptionCandidateUsageFactAdapter';

describe('subscription candidate usage consistency', () => {
  it.each(['CANDIDATE', 'NOT_CANDIDATE', 'UNKNOWN'] as const)('creates exactly one usage fact for a recurring expense classified %s', (status) => {
    const movement: AnalyticsMovementFactItem = {
      analyticsFactId: 'fact-zero', reference: { source: 'posted', transactionId: 'posted' }, source: 'POSTED',
      schedulingOrigin: { kind: 'recurring', recurringMovementId: 'private-series', cadence: { frequency: 'monthly', interval: 1 } },
      effectiveAt: '2026-09-18T10:30:00Z', accountId: 'account', type: 'expense', currency: 'EUR',
      personalAmount: '0.00', fullAmount: '25.00', ignored: false, categoryAllocations: [], tagIds: [], tags: [],
      subscriptionCandidateStatus: status,
    };

    const recurringFact = adaptAnalyticsRecurringFact(movement);
    const usageFacts = [adaptAnalyticsSubscriptionCandidateUsageFact(movement)].filter((fact) => fact !== null);

    expect(recurringFact).not.toBeNull();
    expect(usageFacts).toHaveLength(1);
    expect(usageFacts[0]).toMatchObject({
      id: `${movement.analyticsFactId}/subscription-candidate`,
      source: recurringFact?.source,
      currency: recurringFact?.currency,
      occurredAt: recurringFact?.occurredAt,
      amount: recurringFact?.amount,
      status,
    });
    expect(usageFacts[0]?.amount).toBe('0.00');
  });
});
