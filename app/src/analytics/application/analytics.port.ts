import type { LedgerCashFlowGranularity, LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';

export type AnalyticsCurrencyScopeInput = {
  currency: string;
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

export type AnalyticsPort = {
  analyticsListCurrencies(): Promise<AnalyticsListCurrenciesResult>;
  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
  analyticsGetPeriodCashFlowSummary(input: AnalyticsCurrencyScopeInput): Promise<AnalyticsCashFlowSummaryResult>;
  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult>;
};
