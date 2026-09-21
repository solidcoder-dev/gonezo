import type { AnalyticsMovementFactItem } from '../application/analytics.port';

export type SubscriptionCandidateClassification =
  | { status: 'CANDIDATE'; frequency: 'weekly' | 'monthly' | 'yearly'; interval: number }
  | { status: 'NOT_CANDIDATE'; reason: 'MERCHANT_REQUIRED' | 'DAILY_CADENCE' }
  | { status: 'UNKNOWN'; reason: 'CADENCE_UNAVAILABLE' };

export function classifySubscriptionCandidate(
  fact: AnalyticsMovementFactItem,
): SubscriptionCandidateClassification | undefined {
  if (fact.schedulingOrigin?.kind !== 'recurring' || fact.type !== 'expense') return undefined;

  const cadence = fact.schedulingOrigin.cadence;
  if (!cadence) return { status: 'UNKNOWN', reason: 'CADENCE_UNAVAILABLE' };
  if (!fact.merchant) return { status: 'NOT_CANDIDATE', reason: 'MERCHANT_REQUIRED' };
  if (cadence.frequency === 'daily') return { status: 'NOT_CANDIDATE', reason: 'DAILY_CADENCE' };
  return { status: 'CANDIDATE', frequency: cadence.frequency, interval: cadence.interval };
}
