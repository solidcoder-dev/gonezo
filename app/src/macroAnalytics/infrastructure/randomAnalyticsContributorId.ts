import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import type { ContributorIdGenerator } from '../application/analyticsContributorIdentity.port';

export const generateAnalyticsContributorId: ContributorIdGenerator = () => createAnalyticsContributorId(crypto.randomUUID());
