import { normalizeAnalyticsFilters, type AnalyticsFiltersInput, type AnalyticsLocalDate } from './analyticsFilters';
import { resolveAnalyticsPeriodWindow, type AnalyticsResolvedPeriodWindow } from './analyticsPeriodResolver';

export type AnalyticsQueryContext = Readonly<{
  currency: string;
  filters: ReturnType<typeof normalizeAnalyticsFilters>;
  currentWindow?: AnalyticsResolvedPeriodWindow['currentRange'];
  comparisonWindow?: AnalyticsResolvedPeriodWindow['comparisonRange'];
  currentWindowLabel: string;
  comparisonWindowLabel?: string;
}>;

export function createAnalyticsQueryContext(input: {
  filters: AnalyticsFiltersInput;
  referenceDate: AnalyticsLocalDate;
  shift?: number;
}): AnalyticsQueryContext {
  const filters = {
    ...normalizeAnalyticsFilters(input.filters),
    includePlannedMovements: input.filters.includePlannedMovements === true,
  };
  const selectionShift = Math.min(0, Math.trunc(input.shift ?? 0));
  let currentPeriod = filters.period;
  let resolved = resolveAnalyticsPeriodWindow(currentPeriod, input.referenceDate, filters.includePlannedMovements);

  for (let index = 0; index > selectionShift; index -= 1) {
    if (!resolved.comparisonRange) break;
    currentPeriod = { kind: 'custom', ...resolved.comparisonRange };
    resolved = resolveAnalyticsPeriodWindow(currentPeriod, resolved.comparisonRange.to, filters.includePlannedMovements);
  }

  if (resolved.currentRange && filters.period.kind === 'lastMonth') {
    const currentStart = new Date(`${resolved.currentRange.from}T00:00:00.000Z`);
    const previousStart = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 1, 1));
    const previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 1, 0));
    const from = previousStart.toISOString().slice(0, 10);
    const to = previousEnd.toISOString().slice(0, 10);
    resolved = {
      ...resolved,
      comparisonRange: { from, to },
      comparisonWindowLabel: `${previousStart.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}-${previousEnd.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${previousEnd.getUTCFullYear()}`,
    };
  } else if (resolved.currentRange && (filters.period.kind === 'thisMonth' || filters.period.kind === 'thisYear')) {
    const comparison = resolveAnalyticsPeriodWindow(filters.period, resolved.currentRange.to, filters.includePlannedMovements);
    resolved = { ...resolved, comparisonRange: comparison.comparisonRange, comparisonWindowLabel: comparison.comparisonWindowLabel };
  }

  return Object.freeze({
    currency: filters.currency,
    filters,
    currentWindow: resolved.currentRange,
    comparisonWindow: resolved.comparisonRange,
    currentWindowLabel: resolved.currentWindowLabel,
    comparisonWindowLabel: resolved.comparisonWindowLabel,
  });
}
