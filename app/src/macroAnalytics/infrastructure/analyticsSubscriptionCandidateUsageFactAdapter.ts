import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createSubscriptionCandidateUsageFact, type SubscriptionCandidateUsageFact, type SubscriptionCandidateUsageSource } from '../domain/subscriptionCandidateUsageFact';

const sourceByAnalyticsSource = {
  POSTED: 'POSTED',
  EXPECTED: 'EXPECTED',
  SCHEDULED_PROJECTION: 'SCHEDULED',
} satisfies Record<AnalyticsMovementFactItem['source'], SubscriptionCandidateUsageSource>;

export function adaptAnalyticsSubscriptionCandidateUsageFact(item: AnalyticsMovementFactItem): SubscriptionCandidateUsageFact | null {
  if (item.ignored || item.subscriptionCandidateStatus === undefined) return null;

  return createSubscriptionCandidateUsageFact({
    id: `${item.analyticsFactId}/subscription-candidate`,
    occurredAt: item.effectiveAt,
    source: sourceByAnalyticsSource[item.source],
    currency: item.currency,
    amount: item.personalAmount,
    status: item.subscriptionCandidateStatus,
  });
}
