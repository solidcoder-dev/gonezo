import type { CorePort } from '../application/corePort';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCurrencyScopeInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsGetFilterFacetsInput,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
  AnalyticsListIgnoredMovementsResult,
  AnalyticsListMovementFactsInput,
  AnalyticsListMovementFactsResult,
  AnalyticsOverviewInsightsInput,
  AnalyticsOverviewInsightsResult,
  AnalyticsOverviewSnapshotInput,
  AnalyticsOverviewSnapshotResult,
  AnalyticsSetMovementIgnoredInput,
  AnalyticsSpendingDashboardInput,
  AnalyticsSpendingDashboardResult,
  AnalyticsSpendingOverviewInput,
  AnalyticsSpendingOverviewResult,
  AnalyticsSpendingTimelineInput,
  AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesInput,
  AnalyticsSpendingTopExpensesResult,
  AnalyticsSpendingReportInput,
  AnalyticsSpendingReport,
  AnalyticsTopExpensesInput,
  AnalyticsTopExpensesResult,
  AnalyticsFlowReportInput,
  AnalyticsFlowReport,
} from '../../analytics/application/analytics.port';
import type { LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import {
  analyticsGetCashFlowSeries,
  analyticsGetFilterFacets,
  analyticsGetFlowReport,
  analyticsGetOverviewInsights,
  analyticsGetOverviewSnapshot,
  analyticsGetSpendingDashboard,
  analyticsGetPeriodCashFlowSummary,
  analyticsGetSpendingOverview,
  analyticsGetSpendingTimeline,
  analyticsGetSpendingTopExpenses,
  analyticsGetSpendingReport,
  analyticsGetAnalyticsTopExpenses,
  analyticsListCurrencies,
} from '../../analytics/infrastructure/analyticsQueries';
import type { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class AnalyticsRuntimeAdapter {
  private readonly web: CoreAdapterWeb;
  private readonly queries: CorePort;

  constructor(web: CoreAdapterWeb, queries: CorePort) {
    this.web = web;
    this.queries = queries;
  }

  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult> {
    if (!isNativeRuntime()) {
      return Promise.reject(new Error('analyticsListMovementFacts is only available in the native runtime'));
    }
    return CorePlugin.analyticsListMovementFacts(input);
  }

  analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult> {
    return isNativeRuntime() ? analyticsListCurrencies(this.queries) : this.web.analyticsListCurrencies();
  }

  analyticsGetFilterFacets(input?: AnalyticsGetFilterFacetsInput): Promise<AnalyticsGetFilterFacetsResult> {
    return isNativeRuntime() ? analyticsGetFilterFacets(this.queries, input) : this.web.analyticsGetFilterFacets(input);
  }

  analyticsGetOverviewSnapshot(input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult> {
    return isNativeRuntime() ? analyticsGetOverviewSnapshot(this.queries, input) : this.web.analyticsGetOverviewSnapshot(input);
  }

  analyticsGetOverviewInsights(input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult> {
    return isNativeRuntime() ? analyticsGetOverviewInsights(this.queries, input) : this.web.analyticsGetOverviewInsights(input);
  }

  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> {
    return isNativeRuntime() ? analyticsGetCashFlowSeries(this.queries, input) : this.web.analyticsGetCashFlowSeries(input);
  }

  analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult> {
    return isNativeRuntime()
      ? analyticsGetPeriodCashFlowSummary(this.queries, input)
      : this.web.analyticsGetPeriodCashFlowSummary(input);
  }

  analyticsGetSpendingDashboard(input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult> {
    return isNativeRuntime() ? analyticsGetSpendingDashboard(this.queries, input) : this.web.analyticsGetSpendingDashboard(input);
  }

  analyticsGetSpendingTimeline(input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult> {
    return isNativeRuntime() ? analyticsGetSpendingTimeline(this.queries, input) : this.web.analyticsGetSpendingTimeline(input);
  }

  analyticsGetSpendingTopExpenses(input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult> {
    return isNativeRuntime() ? analyticsGetSpendingTopExpenses(this.queries, input) : this.web.analyticsGetSpendingTopExpenses(input);
  }

  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult> {
    return isNativeRuntime() ? analyticsGetSpendingOverview(this.queries, input) : this.web.analyticsGetSpendingOverview(input);
  }

  analyticsGetSpendingReport(input: AnalyticsSpendingReportInput): Promise<AnalyticsSpendingReport> {
    return isNativeRuntime() ? analyticsGetSpendingReport(this.queries, input) : this.web.analyticsGetSpendingReport(input);
  }

  analyticsGetAnalyticsTopExpenses(input: AnalyticsTopExpensesInput): Promise<AnalyticsTopExpensesResult> {
    return isNativeRuntime() ? analyticsGetAnalyticsTopExpenses(this.queries, input) : this.web.analyticsGetAnalyticsTopExpenses(input);
  }

  analyticsGetFlowReport(input: AnalyticsFlowReportInput): Promise<AnalyticsFlowReport> {
    return isNativeRuntime() ? analyticsGetFlowReport(this.queries, input) : this.web.analyticsGetFlowReport(input);
  }

  analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void> {
    return isNativeRuntime() ? CorePlugin.analyticsSetMovementIgnored(input) : this.web.analyticsSetMovementIgnored(input);
  }

  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult> {
    return isNativeRuntime() ? CorePlugin.analyticsListIgnoredMovements() : this.web.analyticsListIgnoredMovements();
  }
}
