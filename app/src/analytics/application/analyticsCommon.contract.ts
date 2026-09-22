import type { AnalyticsFiltersInput } from './analyticsFilters';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type AnalyticsCurrencyScopeInput = { currency: string; filters?: AnalyticsFiltersInput; periodSelection?: AnalyticsPeriodSelection };
export type AnalyticsPeriodWindow = { label: string; periodOffset: number; canGoPrevious: boolean; canGoNext: boolean };
