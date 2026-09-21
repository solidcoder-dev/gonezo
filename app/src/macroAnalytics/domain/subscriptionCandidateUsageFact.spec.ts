import { describe, expect, it } from 'vitest';
import { createSubscriptionCandidateUsageFact } from './subscriptionCandidateUsageFact';

describe('createSubscriptionCandidateUsageFact', () => {
  it('accepts a timezone-qualified anonymous occurrence fact', () => {
    expect(createSubscriptionCandidateUsageFact({
      id: 'posted/one/subscription-candidate', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED',
      currency: 'EUR', amount: '0.00', status: 'UNKNOWN',
    })).toEqual({
      id: 'posted/one/subscription-candidate', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED',
      currency: 'EUR', amount: '0.00', status: 'UNKNOWN',
    });
  });

  it('rejects noncanonical amount, currency, and timestamp values', () => {
    const fact = { id: 'fact', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED' as const, currency: 'EUR', amount: '1', status: 'CANDIDATE' as const };
    expect(() => createSubscriptionCandidateUsageFact({ ...fact, amount: '-1' })).toThrow(/non-negative/u);
    expect(() => createSubscriptionCandidateUsageFact({ ...fact, currency: 'eur' })).toThrow(/uppercase/u);
    expect(() => createSubscriptionCandidateUsageFact({ ...fact, occurredAt: '2026-09-18T10:30:00' })).toThrow(/timezone-qualified/u);
  });
});
