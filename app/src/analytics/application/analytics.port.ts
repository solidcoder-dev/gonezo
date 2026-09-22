import type { LedgerCashFlowGranularity } from '../../ledger/application/ledger.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type {
  AnalyticsCategoryReference,
  AnalyticsSpendingMovement,
  AnalyticsSpendingReport,
  AnalyticsSpendingPeriodWindow,
} from './spendingReport';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';
import type { AnalyticsFlowReport } from './analyticsFlowReport';
import type { MetricId } from '../../shared/domain/analyticsMetric';
import type { UserMetricResult } from '../domain/userMetricResult';
export type {
  AnalyticsAccountBalanceCoverageResult,
  AnalyticsAccountBalanceSnapshotInput,
  AnalyticsAccountBalanceSnapshotItem,
  AnalyticsAccountBalanceSnapshotResult,
} from './analyticsBalance.contract';

export type AnalyticsCurrencyScopeInput = {
  currency: string;
  filters?: AnalyticsFiltersInput;
  periodSelection?: AnalyticsPeriodSelection;
};

export type AnalyticsQueryMetricsInput = AnalyticsCurrencyScopeInput & {
  metricIds: readonly MetricId[];
};

export type AnalyticsQueryMetricsResult = {
  items: readonly UserMetricResult[];
};

export type {
  AnalyticsCategoryAllocation,
  AnalyticsListMovementFactsInput,
  AnalyticsListMovementFactsResult,
  AnalyticsMerchantReference,
  AnalyticsMovementFactItem,
  AnalyticsRecurrenceCadence,
  AnalyticsSchedulingOrigin,
  AnalyticsSharingSummary,
} from './analyticsMovementFacts.contract';

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
  inflowAmount?: string;
  outflowAmount?: string;
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
  inflowAmount?: string;
  outflowAmount?: string;
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
  filterIntent?: 'topTags' | 'sharedExpenses' | 'mostSharedWith' | 'transfers' | 'recurringImpact';
  tagIds?: string[];
  sharingPersonId?: string;
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

export type AnalyticsFlowReportInput = AnalyticsCurrencyScopeInput & { periodSelection: AnalyticsPeriodSelection };
export type { AnalyticsFlowReport, AnalyticsPeriodSelection };

export type AnalyticsSetMovementIgnoredInput =
  | { source: 'posted'; transactionId: string; ignored: boolean; changedAt?: string }
  | { source: 'expected'; expectedMovementId: string; ignored: boolean; changedAt?: string }
  | { source: 'scheduledProjection'; recurringMovementId: string; occurrenceId: string; ignored: boolean; changedAt?: string };

export type AnalyticsListIgnoredMovementsResult = {
  movementIds: string[];
};

import type {
  AnalyticsBalancePort,
  AnalyticsExclusionsPort,
  AnalyticsFlowPort,
  AnalyticsMetricsPort,
  AnalyticsOverviewPort,
  AnalyticsSpendingPort,
} from './analytics.capabilities';

export type AnalyticsPort = AnalyticsBalancePort & AnalyticsMetricsPort & AnalyticsSpendingPort & AnalyticsFlowPort & AnalyticsOverviewPort & AnalyticsExclusionsPort;

export type AnalyticsSpendingReportInput = AnalyticsCurrencyScopeInput & {
  periodSelection: AnalyticsPeriodSelection;
  categoryId?: string;
};

export type AnalyticsTopExpenseDto = {
  movementId: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  categoryName?: string;
  amount: { value: string; currency: string };
  occurredAt: string;
};

export type AnalyticsTopExpensesInput = AnalyticsSpendingReportInput & {
  page?: { limit?: number; offset?: number };
};

export type AnalyticsTopExpensesResult = {
  window: AnalyticsSpendingPeriodWindow;
  items: AnalyticsTopExpenseDto[];
  totalCount: number;
};

export type { AnalyticsCategoryReference, AnalyticsSpendingMovement, AnalyticsSpendingReport, AnalyticsSpendingPeriodWindow };
