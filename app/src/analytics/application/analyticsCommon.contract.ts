import type { AnalyticsFiltersInput } from './analyticsFilters';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type AnalyticsCurrencyScopeInput = { currency: string; filters?: AnalyticsFiltersInput; periodSelection?: AnalyticsPeriodSelection };
export type AnalyticsPeriodWindow = { label: string; periodOffset: number; canGoPrevious: boolean; canGoNext: boolean };
export type AnalyticsOverviewWindow = { label: string; startDate: string; endDate: string };
export type AnalyticsOverviewHighlight = { movementId: string; title: string; subtitle?: string; amount: string; occurredAt: string };
