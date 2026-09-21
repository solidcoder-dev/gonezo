import { describe, expect, it } from 'vitest';
import type { AnalyticsMovementFactItem } from '../application/analytics.port';
import { classifySubscriptionCandidate } from './subscriptionCandidateClassifier';

function fact(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'fact', reference: { source: 'posted', transactionId: 'transaction' },
    source: 'POSTED', schedulingOrigin: { kind: 'recurring', recurringMovementId: 'series', cadence: { frequency: 'monthly', interval: 1 } },
    effectiveAt: '2026-01-01T00:00:00Z', accountId: 'account', type: 'expense', currency: 'EUR',
    personalAmount: '10', fullAmount: '10', ignored: false, categoryAllocations: [], tagIds: [], tags: [],
    merchant: { key: 'merchant', displayName: 'Merchant' }, ...overrides,
  };
}

describe('classifySubscriptionCandidate', () => {
  it.each([
    ['weekly', 1], ['monthly', 1], ['yearly', 1], ['weekly', 2], ['monthly', 3], ['yearly', 5],
  ] as const)('classifies %s interval %i as a candidate', (frequency, interval) => {
    expect(classifySubscriptionCandidate(fact({ schedulingOrigin: { kind: 'recurring', recurringMovementId: 'series', cadence: { frequency, interval } } })))
      .toEqual({ status: 'CANDIDATE', frequency, interval });
  });

  it('returns explainable non-candidate and unknown results', () => {
    expect(classifySubscriptionCandidate(fact({ schedulingOrigin: { kind: 'recurring', recurringMovementId: 'series', cadence: { frequency: 'daily', interval: 1 } } })))
      .toEqual({ status: 'NOT_CANDIDATE', reason: 'DAILY_CADENCE' });
    expect(classifySubscriptionCandidate(fact({ merchant: undefined })))
      .toEqual({ status: 'NOT_CANDIDATE', reason: 'MERCHANT_REQUIRED' });
    expect(classifySubscriptionCandidate(fact({ schedulingOrigin: { kind: 'recurring', recurringMovementId: 'series' } })))
      .toEqual({ status: 'UNKNOWN', reason: 'CADENCE_UNAVAILABLE' });
  });

  it.each([
    { type: 'income' },
    { type: 'transfer_in' },
    { type: 'transfer_out' },
    { schedulingOrigin: { kind: 'one_shot', recurringMovementId: 'series' } },
  ] as const)('does not classify inapplicable facts', (overrides) => {
    expect(classifySubscriptionCandidate(fact(overrides))).toBeUndefined();
  });

  it('uses no taxonomy evidence', () => {
    const baseline = classifySubscriptionCandidate(fact());
    expect(classifySubscriptionCandidate(fact({ categoryId: 'category', tagIds: ['tag'] }))).toEqual(baseline);
  });
});
