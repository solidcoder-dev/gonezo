import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createSubscriptionCandidateUsageFact, type SubscriptionCandidateUsageFact } from '../domain/subscriptionCandidateUsageFact';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

export function adaptAnalyticsSubscriptionCandidateUsageFact(item: AnalyticsMovementFactItem): SubscriptionCandidateUsageFact | null {
  if (item.ignored || item.subscriptionCandidateStatus === undefined) return null;

  return createSubscriptionCandidateUsageFact({
    id: `${item.analyticsFactId}/subscription-candidate`,
    occurredAt: item.effectiveAt,
    source: mapAnalyticsMovementSource(item.source),
    currency: item.currency,
    amount: item.personalAmount,
    status: item.subscriptionCandidateStatus,
  });
}
