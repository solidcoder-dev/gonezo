import type { AnalyticsPeriod } from './analyticsPeriod';
import type { ContributionDimensions } from './contributionDimensions';
import type { FinancialContribution } from './financialContribution';
import type { MACRO_ANALYTICS_SCHEMA_VERSION_V1, MACRO_ANALYTICS_SCHEMA_VERSION_V2 } from './macroAnalyticsSchemaVersion';
import type { CategoryContribution } from './categoryContribution';
import type { MACRO_ANALYTICS_SCHEMA_VERSION_V3 } from './macroAnalyticsSchemaVersion';
import type { RecurringContribution } from './recurringContribution';
import type { SharingContribution } from './sharingContribution';
import type { MerchantContribution } from './merchantContribution';
import type { AccountBalanceContribution } from './accountBalanceContribution';
import type { TagUsageContribution } from './tagUsageContribution';

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
export type MacroAnalyticsContributionV3 = ContributionBase & Readonly<{
  schemaVersion: typeof MACRO_ANALYTICS_SCHEMA_VERSION_V3;
  categories: CategoryContribution;
  recurring: RecurringContribution;
}>;
export type MacroAnalyticsContributionV4 = ContributionBase & Readonly<{
  schemaVersion: 4;
  categories: CategoryContribution;
  recurring: RecurringContribution;
  sharing: SharingContribution;
}>;
export type MacroAnalyticsContributionV5 = ContributionBase & Readonly<{
  schemaVersion: 5;
  categories: CategoryContribution;
  recurring: RecurringContribution;
  sharing: SharingContribution;
  merchants: MerchantContribution;
}>;
export type MacroAnalyticsContributionV6 = ContributionBase & Readonly<{
  schemaVersion: 6;
  categories: CategoryContribution;
  recurring: RecurringContribution;
  sharing: SharingContribution;
  merchants: MerchantContribution;
  balances: AccountBalanceContribution;
}>;
export type MacroAnalyticsContributionV7 = ContributionBase & Readonly<{
  schemaVersion: 7;
  categories: CategoryContribution;
  recurring: RecurringContribution;
  sharing: SharingContribution;
  merchants: MerchantContribution;
  balances: AccountBalanceContribution;
  tagUsage: TagUsageContribution;
}>;
export type MacroAnalyticsContribution = MacroAnalyticsContributionV1 | MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7;
