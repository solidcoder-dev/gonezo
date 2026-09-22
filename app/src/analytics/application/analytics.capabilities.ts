import type {
  AnalyticsAccountBalanceCoverageResult,
  AnalyticsAccountBalanceSnapshotInput,
  AnalyticsAccountBalanceSnapshotResult,
} from './analyticsBalance.contract';
import type {
  AnalyticsMovementFactsPort as MovementFactsContract,
} from './analyticsMovementFacts.contract';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsCurrencyScopeInput,
  AnalyticsFlowInsightsResult,
  AnalyticsFlowProjectionInput,
  AnalyticsFlowProjectionResult,
  AnalyticsFlowReport,
  AnalyticsFlowReportInput,
  AnalyticsFlowUpcomingInput,
  AnalyticsFlowUpcomingResult,
  AnalyticsGetFilterFacetsInput,
  AnalyticsListCurrenciesResult,
  AnalyticsListIgnoredMovementsResult,
  AnalyticsOverviewInsightsResult,
  AnalyticsOverviewInsightsInput,
  AnalyticsOverviewSnapshotInput,
  AnalyticsOverviewSnapshotResult,
  AnalyticsQueryMetricsInput,
  AnalyticsQueryMetricsResult,
  AnalyticsSetMovementIgnoredInput,
  AnalyticsSpendingDashboardInput,
  AnalyticsSpendingDashboardResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
  AnalyticsSpendingReport,
  AnalyticsSpendingReportInput,
  AnalyticsSpendingTimelineInput,
  AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesInput,
  AnalyticsSpendingTopExpensesResult,
  AnalyticsTopExpensesInput,
  AnalyticsTopExpensesResult,
} from './analytics.port';
import type { AnalyticsGetFilterFacetsResult, AnalyticsFlowInsightsInput } from './analytics.port';
import type { LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';

export type AnalyticsMovementFactsPort = MovementFactsContract;

export type AnalyticsBalancePort = Readonly<{
  analyticsGetAccountBalanceSnapshot(input: AnalyticsAccountBalanceSnapshotInput): Promise<AnalyticsAccountBalanceSnapshotResult>;
  analyticsGetAccountBalanceCoverage(input: { zoneId: string }): Promise<AnalyticsAccountBalanceCoverageResult>;
}>;

export type AnalyticsMetricsPort = Readonly<{
  analyticsQueryMetrics(input: AnalyticsQueryMetricsInput): Promise<AnalyticsQueryMetricsResult>;
}>;

export type AnalyticsSpendingPort = {
  analyticsGetSpendingDashboard(input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult>;
  analyticsGetSpendingTimeline(input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult>;
  analyticsGetSpendingTopExpenses(input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult>;
  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult>;
  analyticsGetSpendingReport?: (input: AnalyticsSpendingReportInput) => Promise<AnalyticsSpendingReport>;
  analyticsGetAnalyticsTopExpenses?: (input: AnalyticsTopExpensesInput) => Promise<AnalyticsTopExpensesResult>;
};

export type AnalyticsFlowPort = {
  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
  analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult>;
  analyticsGetFlowReport?: (input: AnalyticsFlowReportInput) => Promise<AnalyticsFlowReport>;
  analyticsGetFlowProjection?: (input: AnalyticsFlowProjectionInput) => Promise<AnalyticsFlowProjectionResult>;
  analyticsGetFlowUpcoming?: (input: AnalyticsFlowUpcomingInput) => Promise<AnalyticsFlowUpcomingResult>;
  analyticsGetFlowInsights?: (input: AnalyticsFlowInsightsInput) => Promise<AnalyticsFlowInsightsResult>;
};

export type AnalyticsOverviewPort = {
  analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult>;
  analyticsGetFilterFacets(input?: AnalyticsGetFilterFacetsInput): Promise<AnalyticsGetFilterFacetsResult>;
  analyticsGetOverviewSnapshot(input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult>;
  analyticsGetOverviewInsights(input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult>;
};

export type AnalyticsExclusionsPort = {
  analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void>;
  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult>;
};
