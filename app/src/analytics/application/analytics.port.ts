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

export type AnalyticsSpendingOverviewCategory = {
  categoryId?: string;
  categoryName: string;
  amount: string;
  percentage: number;
};

export type AnalyticsSpendingOverviewResult = {
  granularity: LedgerCashFlowGranularity;
  window: AnalyticsPeriodWindow;
  totalExpenseAmount: string;
  categories: AnalyticsSpendingOverviewCategory[];
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
  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
  analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult>;
  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult>;
  analyticsSetMovementIgnored(input: AnalyticsSetMovementIgnoredInput): Promise<void>;
  analyticsListIgnoredMovements(): Promise<AnalyticsListIgnoredMovementsResult>;
};
