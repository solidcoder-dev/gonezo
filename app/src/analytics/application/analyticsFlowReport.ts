import type { AnalyticsPeriod } from './analyticsFilters';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type AnalyticsMoneyDto = { value: string; currency: string };
export type AnalyticsFlowFact = {
  id: string;
  source: 'posted' | 'expected' | 'scheduledProjection';
  effectiveAt: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: AnalyticsMoneyDto;
};
export type AnalyticsFlowProjectionPoint = { occurredAt: string; balance: AnalyticsMoneyDto; phase: 'posted' | 'projected' };
export type AnalyticsFlowInsightKey = 'bestPeriod' | 'worstPeriod' | 'averageDailyFlow' | 'highestBalance' | 'lowestBalance' | 'largestInflow';
export type AnalyticsFlowInsight = { key: AnalyticsFlowInsightKey; amount: AnalyticsMoneyDto; occurredAt?: string; supportingValue?: string };
export type AnalyticsFlowReport = {
  window: { start: string; endExclusive: string; selection: AnalyticsPeriodSelection; canGoPrevious: boolean; canGoNext: boolean };
  windowRelation: 'current' | 'past';
  projectionMode: 'accountBalance' | 'filteredImpact';
  currency: string;
  summary: {
    openingBalance: AnalyticsMoneyDto;
    currentBalance?: AnalyticsMoneyDto;
    endBalance: AnalyticsMoneyDto;
    netFlow: AnalyticsMoneyDto;
    lowestBalance: { amount: AnalyticsMoneyDto; occurredAt: string };
    highestBalance: { amount: AnalyticsMoneyDto; occurredAt: string };
  };
  projection: AnalyticsFlowProjectionPoint[];
  upcoming: {
    incomingTotal: AnalyticsMoneyDto;
    outgoingTotal: AnalyticsMoneyDto;
    incomingCount: number;
    outgoingCount: number;
    nextIncomingAt?: string;
    nextOutgoingAt?: string;
  };
  insights: AnalyticsFlowInsight[];
};

export function buildAnalyticsFlowReport(input: {
  window: AnalyticsFlowReport['window'];
  windowRelation: 'current' | 'past';
  projectionMode: AnalyticsFlowReport['projectionMode'];
  currency: string;
  summary: AnalyticsFlowReport['summary'];
  projection: AnalyticsFlowReport['projection'];
  upcoming: AnalyticsFlowReport['upcoming'];
  insights: AnalyticsFlowReport['insights'];
}): AnalyticsFlowReport {
  return {
    window: input.window,
    windowRelation: input.windowRelation,
    projectionMode: input.projectionMode,
    currency: input.currency,
    summary: input.summary,
    projection: input.projection,
    upcoming: input.upcoming,
    insights: input.insights,
  };
}

export type AnalyticsFlowPeriod = AnalyticsPeriod;
