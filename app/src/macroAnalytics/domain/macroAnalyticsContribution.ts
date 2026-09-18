import type { AnalyticsPeriod } from './analyticsPeriod';
import type { ContributionDimensions } from './contributionDimensions';
import type { FinancialContribution } from './financialContribution';
import type { MacroAnalyticsSchemaVersion } from './macroAnalyticsSchemaVersion';

export type MacroAnalyticsContribution = Readonly<{
  schemaVersion: MacroAnalyticsSchemaVersion;
  period: AnalyticsPeriod;
  dimensions: ContributionDimensions;
  financial: FinancialContribution;
}>;
