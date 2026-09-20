import type { AnalyticsPeriod } from './analyticsPeriod';
import type { ContributionDimensions } from './contributionDimensions';
import type { FinancialContribution } from './financialContribution';
import type { MACRO_ANALYTICS_SCHEMA_VERSION_V1, MACRO_ANALYTICS_SCHEMA_VERSION_V2 } from './macroAnalyticsSchemaVersion';
import type { CategoryContribution } from './categoryContribution';

type ContributionBase = Readonly<{
  period: AnalyticsPeriod;
  dimensions: ContributionDimensions;
  financial: FinancialContribution;
}>;

export type MacroAnalyticsContributionV1 = ContributionBase & Readonly<{ schemaVersion: typeof MACRO_ANALYTICS_SCHEMA_VERSION_V1 }>;
export type MacroAnalyticsContributionV2 = ContributionBase & Readonly<{
  schemaVersion: typeof MACRO_ANALYTICS_SCHEMA_VERSION_V2;
  categories: CategoryContribution;
}>;
export type MacroAnalyticsContribution = MacroAnalyticsContributionV1 | MacroAnalyticsContributionV2;
