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
export { createAnalyticsContributorId } from '../domain/analyticsContributorId';
export type { AnalyticsContributorId } from '../domain/analyticsContributorId';
export { MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION } from '../domain/macroAnalyticsPublicationProtocolVersion';
export type { MacroAnalyticsPublicationProtocolVersion } from '../domain/macroAnalyticsPublicationProtocolVersion';
export { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
export type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
export { canonicalMacroAnalyticsContribution } from '../domain/canonicalMacroAnalyticsContribution';
export { prepareMacroAnalyticsPublication } from './prepareMacroAnalyticsPublication';
export type { PrepareMacroAnalyticsPublicationInput, PrepareMacroAnalyticsPublicationResult } from './prepareMacroAnalyticsPublication';
export { getOrCreateAnalyticsContributorId } from './analyticsContributorIdentityUseCase';
export type { AnalyticsContributorIdentityPort, ContributorIdGenerator } from './analyticsContributorIdentity.port';
export type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
export { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
export type {
  BuildMacroAnalyticsContributionInput,
  BuildMacroAnalyticsContributionPorts,
  BuildMacroAnalyticsContributionResult,
} from './buildMacroAnalyticsContribution';
export type { ContributionProfileSourcePort } from './contributionProfileSource.port';
