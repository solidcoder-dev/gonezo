import type { CorePort } from '../application/corePort';
import type {
  AnalyticsCashFlowSeriesInput,
  AnalyticsCashFlowSummaryResult,
  AnalyticsGetFilterFacetsInput,
  AnalyticsGetFilterFacetsResult,
  AnalyticsListCurrenciesResult,
  AnalyticsFlowInsightsInput,
  AnalyticsFlowInsightsResult,
  AnalyticsFlowProjectionInput,
  AnalyticsFlowProjectionResult,
  AnalyticsFlowUpcomingInput,
  AnalyticsFlowUpcomingResult,
  AnalyticsListIgnoredMovementsResult,
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
} from '../../analytics/application/analytics.port';
import type { LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import {
  analyticsGetCashFlowSeries,
  analyticsGetFilterFacets,
  analyticsGetFlowInsights,
  analyticsGetFlowProjection,
  analyticsGetFlowUpcoming,
  analyticsGetOverviewInsights,
  analyticsGetOverviewSnapshot,
  analyticsGetSpendingDashboard,
  analyticsGetPeriodCashFlowSummary,
  analyticsGetSpendingOverview,
  analyticsGetSpendingTimeline,
  analyticsGetSpendingTopExpenses,
  analyticsListCurrencies,
} from '../../analytics/infrastructure/analyticsQueries';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class AnalyticsRuntimeAdapter {
  private readonly web: CoreAdapterWeb;
  private readonly queries: CorePort;

  constructor(web: CoreAdapterWeb, queries: CorePort) {
    this.web = web;
    this.queries = queries;
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

  analyticsGetPeriodCashFlowSummary(input: { currency: string }): Promise<AnalyticsCashFlowSummaryResult> {
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

  analyticsGetFlowProjection(input: AnalyticsFlowProjectionInput): Promise<AnalyticsFlowProjectionResult> {
    return isNativeRuntime() ? analyticsGetFlowProjection(this.queries, input) : this.web.analyticsGetFlowProjection(input);
  }

  analyticsGetFlowUpcoming(input: AnalyticsFlowUpcomingInput): Promise<AnalyticsFlowUpcomingResult> {
    return isNativeRuntime() ? analyticsGetFlowUpcoming(this.queries, input) : this.web.analyticsGetFlowUpcoming(input);
  }

  analyticsGetFlowInsights(input: AnalyticsFlowInsightsInput): Promise<AnalyticsFlowInsightsResult> {
    return isNativeRuntime() ? analyticsGetFlowInsights(this.queries, input) : this.web.analyticsGetFlowInsights(input);
  }

  analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void> {
    return isNativeRuntime() ? CorePlugin.analyticsSetMovementIgnored(input) : this.web.analyticsSetMovementIgnored(input);
  }

  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult> {
    return isNativeRuntime() ? CorePlugin.analyticsListIgnoredMovements() : this.web.analyticsListIgnoredMovements();
  }
}
