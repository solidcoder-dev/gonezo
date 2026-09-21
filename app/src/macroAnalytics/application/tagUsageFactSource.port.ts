import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { TagUsageFact } from '../domain/tagUsageFact';

export type TagUsageFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type TagUsageFactSourcePort = Readonly<{
  listTagUsageFacts(query: TagUsageFactQuery): Promise<readonly TagUsageFact[]>;
}>;
