import type { AnalyticsPeriod } from '../domain/analyticsPeriod';

export type ContributionPeriodSourcePort = Readonly<{
  listPeriods(timeZone: string, through: AnalyticsPeriod): Promise<readonly AnalyticsPeriod[]>;
}>;
