import type { AnalyticsPeriod } from '../domain/analyticsPeriod';

export type ContributionRebuildQueuePort = Readonly<{
  enqueue(userId: string, period: AnalyticsPeriod): Promise<void>;
  list(userId: string): Promise<readonly AnalyticsPeriod[]>;
  remove(userId: string, period: AnalyticsPeriod): Promise<void>;
  clear(userId: string): Promise<void>;
}>;
