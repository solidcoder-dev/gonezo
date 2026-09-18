export { analyticsPeriodForFact, createAnalyticsPeriod } from '../domain/analyticsPeriod';
export type { AnalyticsPeriod } from '../domain/analyticsPeriod';
export { createFinancialFact } from '../domain/financialFact';
export type {
  DecimalAmount,
  FinancialFact,
  FinancialFactId,
  FinancialFactInput,
  FinancialFactKind,
  FinancialFactSource,
} from '../domain/financialFact';
export { MACRO_ANALYTICS_SCHEMA_VERSION } from '../domain/macroAnalyticsSchemaVersion';
export type { MacroAnalyticsSchemaVersion } from '../domain/macroAnalyticsSchemaVersion';
export { aggregateFinancialFacts } from '../domain/financialContribution';
export type { FinancialContribution, FinancialContributionBucket, FinancialCurrencyContribution } from '../domain/financialContribution';
export { deriveContributionDimensions } from '../domain/contributionDimensions';
export type { ContributionAgeBand, ContributionDimensions, ContributionSex } from '../domain/contributionDimensions';
export type { ContributionProfile, ContributionProfileSex } from '../domain/contributionProfile';
export type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
export { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
export type {
  BuildMacroAnalyticsContributionInput,
  BuildMacroAnalyticsContributionPorts,
  BuildMacroAnalyticsContributionResult,
} from './buildMacroAnalyticsContribution';
export type { ContributionProfileSourcePort } from './contributionProfileSource.port';
