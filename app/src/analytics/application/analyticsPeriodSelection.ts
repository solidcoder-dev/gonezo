import type { AnalyticsPeriod } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import type { AnalyticsResolvedPeriodWindow } from './analyticsPeriodResolver';
import { createAnalyticsQueryContext } from './analyticsQueryContext';

export type AnalyticsPeriodSelection = { period: AnalyticsPeriod; shift: number };

export function normalizeAnalyticsPeriodSelection(input: Partial<AnalyticsPeriodSelection> & { period: AnalyticsPeriod }): AnalyticsPeriodSelection {
  return { period: normalizeAnalyticsPeriodInput(input.period), shift: Math.min(0, Math.trunc(input.shift ?? 0)) };
}

export function resolveAnalyticsPeriodSelectionWindow(
  selection: AnalyticsPeriodSelection,
  referenceDate: string,
  includePlannedMovements = false,
): AnalyticsResolvedPeriodWindow {
  const context = createAnalyticsQueryContext({
    filters: { period: selection.period, includePlannedMovements },
    referenceDate,
    shift: selection.shift,
  });
  return {
    currentRange: context.currentWindow,
    comparisonRange: context.comparisonWindow,
    currentWindowLabel: context.currentWindowLabel,
    comparisonWindowLabel: context.comparisonWindowLabel,
  };
}
