import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsContributorIdentityPort, ContributorIdGenerator } from './analyticsContributorIdentity.port';

export async function getOrCreateAnalyticsContributorId(
  port: AnalyticsContributorIdentityPort,
  generate: ContributorIdGenerator,
  userId: string,
): Promise<AnalyticsContributorId> {
  if (!userId.trim()) throw new Error('Authenticated user is required');
  const existing = await port.get(userId);
  if (existing) return existing;
  const contributorId = generate();
  await port.save(userId, contributorId);
  return contributorId;
}
