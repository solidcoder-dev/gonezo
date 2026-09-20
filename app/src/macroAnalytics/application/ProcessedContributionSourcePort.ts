import type { Cohort } from '../domain/cohort';
import type { AnalyticsContributorId } from '../domain/analyticsContributorId';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';

export type ProcessedContribution = Readonly<{ contributorId: AnalyticsContributorId; contribution: MacroAnalyticsContribution }>;

export type ProcessedContributionSourcePort = Readonly<{
  list(query: Readonly<{ period: AnalyticsPeriod; cohort?: Cohort }>): Promise<readonly ProcessedContribution[]>;
}>;
