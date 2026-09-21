import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { SubscriptionCandidateUsageFact } from '../domain/subscriptionCandidateUsageFact';

export type SubscriptionCandidateUsageFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type SubscriptionCandidateUsageFactSourcePort = Readonly<{
  listSubscriptionCandidateUsageFacts(query: SubscriptionCandidateUsageFactQuery): Promise<readonly SubscriptionCandidateUsageFact[]>;
}>;
