import type { LedgerCashFlowGranularity, LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';

export type AnalyticsCurrencyScopeInput = {
  currency: string;
  filters?: AnalyticsFiltersInput;
};

export type AnalyticsCashFlowSeriesInput = AnalyticsCurrencyScopeInput & {
  granularity: LedgerCashFlowGranularity;
  periodOffset?: number;
};

export type AnalyticsPeriodWindow = {
  label: string;
  periodOffset: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export type AnalyticsSpendingOverviewInput = AnalyticsCurrencyScopeInput & {
  granularity: LedgerCashFlowGranularity;
  periodOffset?: number;
};

export type AnalyticsListCurrenciesResult = {
  items: string[];
};

export type AnalyticsFilterFacetAccount = {
  id: string;
  name: string;
  currency: string;
};

export type AnalyticsFilterFacetTag = {
  id: string;
  name: string;
};

export type AnalyticsGetFilterFacetsInput = {
  filters?: AnalyticsFiltersInput;
};

export type AnalyticsGetFilterFacetsResult = {
  accounts: AnalyticsFilterFacetAccount[];
  tags: AnalyticsFilterFacetTag[];
};

export type AnalyticsCashFlowSummaryResult = {
  incomeAmount: string;
  expenseAmount: string;
  netFlowAmount: string;
  previousIncomeChangePercent?: string;
  previousExpenseChangePercent?: string;
  previousNetFlowChangePercent?: string;
};

export type AnalyticsOverviewWindow = {
  label: string;
  startDate: string;
  endDate: string;
};

export type AnalyticsOverviewTotals = {
  incomeAmount: string;
  expenseAmount: string;
  netFlowAmount: string;
};

export type AnalyticsOverviewHighlight = {
  movementId: string;
  title: string;
  subtitle?: string;
  amount: string;
  occurredAt: string;
};

export type AnalyticsOverviewSnapshotInput = AnalyticsCurrencyScopeInput;

export type AnalyticsOverviewSnapshotResult = {
  currentWindow: AnalyticsOverviewWindow;
  previousWindow?: AnalyticsOverviewWindow;
  currentTotals: AnalyticsOverviewTotals;
  previousTotals?: AnalyticsOverviewTotals;
  netFlowChangePercent?: string;
  biggestExpense?: AnalyticsOverviewHighlight;
  biggestIncome?: AnalyticsOverviewHighlight;
};

export type AnalyticsOverviewInsightKey =
  | 'topTags'
  | 'sharedExpenses'
  | 'mostSharedWith'
  | 'recurringImpact'
  | 'transfers';

export type AnalyticsOverviewInsightItem = {
  key: AnalyticsOverviewInsightKey;
  title: string;
  subtitle: string;
  amount: string;
};

export type AnalyticsOverviewInsightsInput = AnalyticsCurrencyScopeInput;

export type AnalyticsOverviewInsightsResult = {
  items: AnalyticsOverviewInsightItem[];
};

export type AnalyticsSpendingOverviewCategory = {
  categoryId?: string;
  categoryName: string;
  amount: string;
  percentage: number;
};

export type AnalyticsSpendingDashboardInput = AnalyticsCurrencyScopeInput;

export type AnalyticsSpendingDashboardResult = {
  currentWindow: AnalyticsOverviewWindow;
  previousWindow?: AnalyticsOverviewWindow;
  totalExpenseAmount: string;
  previousExpenseChangePercent?: string;
  categories: AnalyticsSpendingOverviewCategory[];
};

export type AnalyticsSpendingOverviewResult = {
  granularity: LedgerCashFlowGranularity;
  window: AnalyticsPeriodWindow;
  totalExpenseAmount: string;
  categories: AnalyticsSpendingOverviewCategory[];
};

export type AnalyticsSpendingTimelinePoint = {
  periodKey: string;
  label: string;
  amount: string;
};

export type AnalyticsSpendingTimelineInput = AnalyticsCurrencyScopeInput & {
  periodOffset?: number;
};

export type AnalyticsSpendingTimelineResult = {
  currentWindow: AnalyticsOverviewWindow;
  window: AnalyticsPeriodWindow;
  points: AnalyticsSpendingTimelinePoint[];
};

export type AnalyticsSpendingTopExpenseItem = AnalyticsOverviewHighlight;

export type AnalyticsSpendingTopExpensesInput = AnalyticsCurrencyScopeInput;

export type AnalyticsSpendingTopExpensesResult = {
  currentWindow: AnalyticsOverviewWindow;
  items: AnalyticsSpendingTopExpenseItem[];
};

export type AnalyticsFlowProjectionPoint = {
  periodKey: string;
  label: string;
  postedBalanceAmount?: string;
  scheduledBalanceAmount?: string;
  expectedBalanceAmount: string;
};

export type AnalyticsFlowProjectionInput = AnalyticsCurrencyScopeInput & {
  periodOffset?: number;
};

export type AnalyticsFlowProjectionResult = {
  currentWindow: AnalyticsOverviewWindow;
  window: AnalyticsPeriodWindow;
  currentBalanceAmount: string;
  expectedEndBalanceAmount: string;
  lowestPointAmount: string;
  lowestPointLabel: string;
  currentMarkerLabel: string;
  points: AnalyticsFlowProjectionPoint[];
};

export type AnalyticsFlowUpcomingItem = {
  movementId: string;
  title: string;
  amount: string;
  occurredAt: string;
};

export type AnalyticsFlowUpcomingInput = AnalyticsCurrencyScopeInput;

export type AnalyticsFlowUpcomingResult = {
  incomeItems: AnalyticsFlowUpcomingItem[];
  expenseItems: AnalyticsFlowUpcomingItem[];
};

export type AnalyticsFlowInsightKey =
  | 'bestPeriod'
  | 'worstPeriod'
  | 'averagePeriod'
  | 'positivePeriods';

export type AnalyticsFlowInsightItem = {
  key: AnalyticsFlowInsightKey;
  title: string;
  subtitle: string;
  amount: string;
  tone: 'income' | 'expense' | 'neutral';
};

export type AnalyticsFlowInsightsInput = AnalyticsCurrencyScopeInput;

export type AnalyticsFlowInsightsResult = {
  items: AnalyticsFlowInsightItem[];
};

export type AnalyticsSetMovementIgnoredInput = {
  movementId: string;
  ignored: boolean;
  changedAt?: string;
};

export type AnalyticsListIgnoredMovementsResult = {
  movementIds: string[];
};

export type AnalyticsPort = {
  analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult>;
  analyticsGetFilterFacets(input?: AnalyticsGetFilterFacetsInput): Promise<AnalyticsGetFilterFacetsResult>;
  analyticsGetOverviewSnapshot(input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult>;
  analyticsGetOverviewInsights(input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult>;
  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
  analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult>;
  analyticsGetSpendingDashboard(input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult>;
  analyticsGetSpendingTimeline(input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult>;
  analyticsGetSpendingTopExpenses(input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult>;
  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult>;
  analyticsGetFlowProjection(input: AnalyticsFlowProjectionInput): Promise<AnalyticsFlowProjectionResult>;
  analyticsGetFlowUpcoming(input: AnalyticsFlowUpcomingInput): Promise<AnalyticsFlowUpcomingResult>;
  analyticsGetFlowInsights(input: AnalyticsFlowInsightsInput): Promise<AnalyticsFlowInsightsResult>;
  analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void>;
  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult>;
};
