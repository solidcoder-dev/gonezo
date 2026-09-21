import { describe, expect, it } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { adaptAnalyticsSubscriptionCandidateUsageFact } from './analyticsSubscriptionCandidateUsageFactAdapter';
import { adaptAnalyticsRecurringFact } from './analyticsRecurringFactAdapter';

function item(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'fact-one',
    reference: { source: 'posted', transactionId: 'private-transaction' },
    source: 'POSTED',
    schedulingOrigin: { kind: 'recurring', recurringMovementId: 'private-series', occurrenceId: 'private-occurrence' },
    effectiveAt: '2026-09-18T10:30:00Z',
    accountId: 'private-account',
    type: 'expense',
    currency: 'EUR',
    personalAmount: '0.00',
    fullAmount: '100.00',
    ignored: false,
    categoryId: 'private-category',
    categoryAllocations: [],
    tagIds: ['private-tag'],
    tags: [],
    merchant: { key: 'private-merchant', displayName: 'Private Merchant' },
    subscriptionCandidateStatus: 'CANDIDATE',
    ...overrides,
  };
}

describe('adaptAnalyticsSubscriptionCandidateUsageFact', () => {
  it.each([
    ['POSTED', 'POSTED'],
    ['EXPECTED', 'EXPECTED'],
    ['SCHEDULED_PROJECTION', 'SCHEDULED'],
  ] as const)('maps %s source and preserves zero personal amount', (source, expectedSource) => {
    const fact = adaptAnalyticsSubscriptionCandidateUsageFact(item({ source }));

    expect(fact).toEqual({
      id: 'fact-one/subscription-candidate',
      occurredAt: '2026-09-18T10:30:00Z',
      source: expectedSource,
      currency: 'EUR',
      amount: '0.00',
      status: 'CANDIDATE',
    });
    expect(JSON.stringify(fact)).not.toMatch(/merchant|series|private-/i);
  });

  it.each(['NOT_CANDIDATE', 'UNKNOWN'] as const)('preserves %s classifier status', (status) => {
    expect(adaptAnalyticsSubscriptionCandidateUsageFact(item({ subscriptionCandidateStatus: status }))?.status).toBe(status);
  });

  it('preserves amount and occurrence dimensions shared with RecurringFact', () => {
    const analyticsFact = item({ subscriptionCandidateStatus: 'UNKNOWN' });
    const recurringFact = adaptAnalyticsRecurringFact(analyticsFact);
    const usageFact = adaptAnalyticsSubscriptionCandidateUsageFact(analyticsFact);

    expect(recurringFact).not.toBeNull();
    expect(usageFact).not.toBeNull();
    expect(usageFact).toMatchObject({
      id: `${analyticsFact.analyticsFactId}/subscription-candidate`,
      source: recurringFact?.source,
      currency: recurringFact?.currency,
      occurredAt: recurringFact?.occurredAt,
      amount: recurringFact?.amount,
    });
  });

  it.each([
    item({ ignored: true }),
    item({ subscriptionCandidateStatus: undefined }),
    item({ type: 'income', subscriptionCandidateStatus: undefined }),
    item({ type: 'transfer_in', subscriptionCandidateStatus: undefined }),
    item({ schedulingOrigin: { kind: 'one_shot', recurringMovementId: 'private-series' }, subscriptionCandidateStatus: undefined }),
  ])('omits ignored or inapplicable facts', (input) => {
    expect(adaptAnalyticsSubscriptionCandidateUsageFact(input)).toBeNull();
  });
});
