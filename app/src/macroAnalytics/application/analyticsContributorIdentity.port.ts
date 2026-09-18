import type { AnalyticsContributorId } from '../domain/analyticsContributorId';

export type AnalyticsContributorIdentityPort = Readonly<{
  get(userId: string): Promise<AnalyticsContributorId | null>;
  save(userId: string, contributorId: AnalyticsContributorId): Promise<void>;
}>;

export type ContributorIdGenerator = () => AnalyticsContributorId;
