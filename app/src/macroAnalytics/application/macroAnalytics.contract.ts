export { analyticsPeriodForFact, createAnalyticsPeriod } from '../domain/analyticsPeriod';
export type { AnalyticsPeriod } from '../domain/analyticsPeriod';
export { createFinancialFact } from '../domain/financialFact';
export type { CategoryFact } from '../domain/categoryFact';
export type { MacroCategoryCode } from '../domain/macroCategoryCode';
export type { MacroAccountTypeCode } from '../domain/macroAccountTypeCode';
export { createAccountBalanceFact } from '../domain/accountBalanceFact';
export type { AccountBalanceFact } from '../domain/accountBalanceFact';
export type { AccountBalanceFactSourcePort, AccountBalanceFactQuery } from './accountBalanceFactSource.port';
export type { CategoryFactSourcePort, CategoryFactQuery } from './categoryFactSource.port';
export type {
  DecimalAmount,
  FinancialFact,
  FinancialFactId,
  FinancialFactInput,
  FinancialFactKind,
  FinancialFactSource,
} from '../domain/financialFact';
export { MACRO_ANALYTICS_SCHEMA_VERSION, MACRO_ANALYTICS_SCHEMA_VERSION_V1, MACRO_ANALYTICS_SCHEMA_VERSION_V2, MACRO_ANALYTICS_SCHEMA_VERSION_V3, MACRO_ANALYTICS_SCHEMA_VERSION_V4, MACRO_ANALYTICS_SCHEMA_VERSION_V5 } from '../domain/macroAnalyticsSchemaVersion';
export { MACRO_MERCHANT_CATALOG_VERSION } from '../domain/macroMerchantCatalogVersion';
export type { MacroAnalyticsSchemaVersion } from '../domain/macroAnalyticsSchemaVersion';
export { aggregateFinancialFacts, financialContributionAmount } from '../domain/financialContribution';
export type { FinancialContribution, FinancialContributionBucket, FinancialCurrencyContribution } from '../domain/financialContribution';
export { aggregateCategoryFacts } from '../domain/categoryContribution';
export type { CategoryContribution, CategoryContributionBucket, CategoryCurrencyContribution } from '../domain/categoryContribution';
export { deriveContributionDimensions } from '../domain/contributionDimensions';
export type { ContributionAgeBand, ContributionDimensions, ContributionSex } from '../domain/contributionDimensions';
export type { ContributionProfile, ContributionProfileSex } from '../domain/contributionProfile';
export type { MacroAnalyticsContribution, MacroAnalyticsContributionV1, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4, MacroAnalyticsContributionV5 } from '../domain/macroAnalyticsContribution';
export { createAnalyticsContributorId } from '../domain/analyticsContributorId';
export type { AnalyticsContributorId } from '../domain/analyticsContributorId';
export { MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V1, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V2, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V3, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V4, MACRO_ANALYTICS_PUBLICATION_PROTOCOL_VERSION_V5 } from '../domain/macroAnalyticsPublicationProtocolVersion';
export type { MacroAnalyticsPublicationProtocolVersion } from '../domain/macroAnalyticsPublicationProtocolVersion';
export { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
export type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
export type { MacroAnalyticsPublicationV1, MacroAnalyticsPublicationV2, MacroAnalyticsPublicationV3, MacroAnalyticsPublicationV4, MacroAnalyticsPublicationV5 } from '../domain/macroAnalyticsPublication';
export { aggregateRecurringFacts } from '../domain/recurringContribution';
export type { RecurringContribution, RecurringContributionBucket, RecurringCurrencyContribution } from '../domain/recurringContribution';
export { createRecurringFact } from '../domain/recurringFact';
export type { RecurringFact, RecurringFactKind, RecurringFactSource } from '../domain/recurringFact';
export type { RecurringFactSourcePort, RecurringFactQuery } from './recurringFactSource.port';
export { createMacroMerchantCode, UNMAPPED_MACRO_MERCHANT_CODE } from '../domain/macroMerchantCode';
export type { MacroMerchantCode } from '../domain/macroMerchantCode';
export type { CanonicalMerchantResolverPort } from './canonicalMerchantResolver.port';
export { createMerchantFact } from '../domain/merchantFact';
export type { MerchantFact, MerchantFactKind, MerchantFactSource } from '../domain/merchantFact';
export type { MerchantFactSourcePort, MerchantFactQuery } from './merchantFactSource.port';
export { aggregateMerchantFacts } from '../domain/merchantContribution';
export type { MerchantContribution, MerchantContributionBucket, MerchantCurrencyContribution } from '../domain/merchantContribution';
export { canonicalMacroAnalyticsContribution } from '../domain/canonicalMacroAnalyticsContribution';
export { prepareMacroAnalyticsPublication } from './prepareMacroAnalyticsPublication';
export type { PrepareMacroAnalyticsPublicationInput, PrepareMacroAnalyticsPublicationResult } from './prepareMacroAnalyticsPublication';
export { getOrCreateAnalyticsContributorId } from './analyticsContributorIdentityUseCase';
export type { AnalyticsContributorIdentityPort, ContributorIdGenerator } from './analyticsContributorIdentity.port';
export type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
export { LocalMacroAnalyticsPublicationProcessor } from './LocalMacroAnalyticsPublicationProcessor';
export type { LatestMacroAnalyticsPublicationPort } from './latestMacroAnalyticsPublication.port';
export { CalculateContributorMetrics } from './CalculateContributorMetrics';
export type { ContributorMetricCalculator, ContributorMetricResult } from '../domain/contributorMetric';
export { contributorFinancialMetricDefinitions } from './contributorFinancialMetrics';
export { contributorRecurringMetricDefinitions } from './contributorRecurringMetrics';
export { contributorBalanceMetricDefinitions } from './contributorBalanceMetrics';
export { createCohort } from '../domain/cohort';
export type { Cohort, CohortInput } from '../domain/cohort';
export { CalculateCohortMetrics } from './CalculateCohortMetrics';
export type { CohortMetricCalculator, CohortMetricResult } from '../domain/cohortMetric';
export { cohortFinancialMetricDefinitions } from './cohortFinancialMetrics';
export { cohortRecurringMetricDefinitions } from './cohortRecurringMetrics';
export { cohortBalanceMetricDefinitions } from './cohortBalanceMetrics';
export type { ProcessedContribution, ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';
export type { MacroOverviewReport } from '../domain/macroOverviewReport';
export { GetMacroOverviewReport } from './GetMacroOverviewReport';
export type { MacroCategoryReport } from '../domain/macroCategoryReport';
export type { CohortCategoryBreakdown, CohortCategoryBreakdownItem } from '../domain/cohortCategoryBreakdown';
export type { ContributorCategoryBreakdown } from '../domain/contributorCategoryBreakdown';
export type { CategoryMoneyAmount } from '../domain/categoryMoneyAmount';
export { buildContributorCategoryBreakdown } from '../domain/contributorCategoryBreakdown';
export { buildCohortCategoryBreakdown } from '../domain/cohortCategoryBreakdown';
export { buildContributorMerchantRanking } from '../domain/contributorMerchantRanking';
export { buildContributorAccountTypeBreakdown } from '../domain/contributorAccountTypeBreakdown';
export type { ContributorAccountTypeBreakdown } from '../domain/contributorAccountTypeBreakdown';
export { buildCohortAccountTypeBreakdown } from '../domain/cohortAccountTypeBreakdown';
export type { CohortAccountTypeBreakdown, CohortAccountTypeBreakdownItem } from '../domain/cohortAccountTypeBreakdown';
export type { ContributorMerchantRanking } from '../domain/contributorMerchantRanking';
export { buildCohortMerchantRanking } from '../domain/cohortMerchantRanking';
export type { CohortMerchantRanking, CohortMerchantRankingItem } from '../domain/cohortMerchantRanking';
export type { MacroMerchantReport } from '../domain/macroMerchantReport';
export { GetMacroMerchantReport } from './GetMacroMerchantReport';
export type { MacroBalanceReport } from '../domain/macroBalanceReport';
export { GetMacroBalanceReport } from './GetMacroBalanceReport';
export { GetMacroCategoryReport } from './GetMacroCategoryReport';
export type { GetMacroCategoryReportInput } from './GetMacroCategoryReport';
export type { MacroRecurringReport } from '../domain/macroRecurringReport';
export { GetMacroRecurringReport } from './GetMacroRecurringReport';
export type { GetMacroRecurringReportInput } from './GetMacroRecurringReport';
export type { MacroAnalyticsPublicationProcessorPort, PublicationProcessingStatus } from './macroAnalyticsPublicationProcessor.port';
export { processPendingMacroAnalyticsPublications } from './processPendingMacroAnalyticsPublications';
export type { PendingPublicationProcessingResult } from './processPendingMacroAnalyticsPublications';
export { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
export type {
  BuildMacroAnalyticsContributionInput,
  BuildMacroAnalyticsContributionPorts,
  BuildMacroAnalyticsContributionResult,
} from './buildMacroAnalyticsContribution';
export type { ContributionProfileSourcePort } from './contributionProfileSource.port';
export type { ContributionRebuildQueuePort } from './contributionRebuildQueue.port';
export type { ContributionPeriodSourcePort } from './contributionPeriodSource.port';
export type { MacroAnalyticsBackfillState, MacroAnalyticsBackfillStatePort } from './macroAnalyticsBackfillState.port';
export { RunMacroAnalyticsMaintenance, INITIAL_CONTRIBUTION_BACKFILL_VERSION } from './RunMacroAnalyticsMaintenance';
export type { MacroAnalyticsMaintenanceResult } from './RunMacroAnalyticsMaintenance';
export { withMacroAnalyticsConsentLifecycle } from './MacroAnalyticsConsentLifecycle';
