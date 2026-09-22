import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';

export type AnalyticsPeriodSnapshot = Readonly<{
  period: AnalyticsPeriod;
  movements: readonly AnalyticsMovementFactItem[];
}>;

export type AnalyticsPeriodSnapshotQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type AnalyticsPeriodSnapshotPort = Readonly<{
  readPeriodSnapshot(query: AnalyticsPeriodSnapshotQuery): Promise<AnalyticsPeriodSnapshot>;
}>;
