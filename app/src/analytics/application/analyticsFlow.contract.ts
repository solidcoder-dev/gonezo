import type { LedgerGetCashFlowSeriesResult } from '../../ledger/application/ledger.port';
import type { AnalyticsCurrencyScopeInput, AnalyticsPeriodWindow } from './analyticsCommon.contract';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';
import type { AnalyticsFlowReport } from './analyticsFlowReport';

export type AnalyticsFlowProjectionPoint = { periodKey: string; label: string; postedBalanceAmount?: string; scheduledBalanceAmount?: string; expectedBalanceAmount: string };
export type AnalyticsFlowProjectionInput = AnalyticsCurrencyScopeInput & { periodOffset?: number };
export type AnalyticsFlowProjectionResult = { currentWindow: { label: string; startDate: string; endDate: string }; window: AnalyticsPeriodWindow; currentBalanceAmount: string; expectedEndBalanceAmount: string; lowestPointAmount: string; lowestPointLabel: string; currentMarkerLabel: string; points: AnalyticsFlowProjectionPoint[] };
export type AnalyticsFlowUpcomingItem = { movementId: string; title: string; amount: string; occurredAt: string };
export type AnalyticsFlowUpcomingInput = AnalyticsCurrencyScopeInput;
export type AnalyticsFlowUpcomingResult = { incomeItems: AnalyticsFlowUpcomingItem[]; expenseItems: AnalyticsFlowUpcomingItem[] };
export type AnalyticsFlowInsightKey = 'bestPeriod' | 'worstPeriod' | 'averagePeriod' | 'positivePeriods';
export type AnalyticsFlowInsightItem = { key: AnalyticsFlowInsightKey; title: string; subtitle: string; amount: string; tone: 'income' | 'expense' | 'neutral' };
export type AnalyticsFlowInsightsInput = AnalyticsCurrencyScopeInput;
export type AnalyticsFlowInsightsResult = { items: AnalyticsFlowInsightItem[] };
export type AnalyticsFlowReportInput = AnalyticsCurrencyScopeInput & { periodSelection: AnalyticsPeriodSelection };
export type { AnalyticsFlowReport, LedgerGetCashFlowSeriesResult };
