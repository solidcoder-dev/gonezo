import type { ContributionProfile } from '../domain/contributionProfile';

export type ContributionProfileSourcePort = Readonly<{
  get(userId: string): Promise<ContributionProfile | null>;
}>;
