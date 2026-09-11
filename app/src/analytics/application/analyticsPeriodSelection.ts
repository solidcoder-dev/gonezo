import type { AnalyticsPeriod } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { resolveAnalyticsPeriodWindow, type AnalyticsResolvedPeriodWindow } from './analyticsPeriodResolver';

export type AnalyticsPeriodSelection = { period: AnalyticsPeriod; shift: number };

export function normalizeAnalyticsPeriodSelection(input: Partial<AnalyticsPeriodSelection> & { period: AnalyticsPeriod }): AnalyticsPeriodSelection {
  return { period: normalizeAnalyticsPeriodInput(input.period), shift: Math.min(0, Math.trunc(input.shift ?? 0)) };
}

export function resolveAnalyticsPeriodSelectionWindow(
  selection: AnalyticsPeriodSelection,
  referenceDate: string,
  includePlannedMovements = false,
): AnalyticsResolvedPeriodWindow {
  let currentSelection = normalizeAnalyticsPeriodSelection(selection);
  let resolved = resolveAnalyticsPeriodWindow(currentSelection.period, referenceDate, includePlannedMovements);

  for (let index = 0; index > currentSelection.shift; index -= 1) {
    if (!resolved.comparisonRange) {
      break;
    }
    currentSelection = {
      period: { kind: 'custom', from: resolved.comparisonRange.from, to: resolved.comparisonRange.to },
      shift: 0,
    };
    resolved = resolveAnalyticsPeriodWindow(currentSelection.period, resolved.comparisonRange.to, includePlannedMovements);
  }

  if (resolved.currentRange && selection.period.kind === 'lastMonth') {
    const currentStart = new Date(`${resolved.currentRange.from}T00:00:00.000Z`);
    const previousStart = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 1, 1));
    const previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 1, 0));
    const from = previousStart.toISOString().slice(0, 10);
    const to = previousEnd.toISOString().slice(0, 10);
    resolved = { ...resolved, comparisonRange: { from, to }, comparisonWindowLabel: `${previousStart.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}-${previousEnd.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${previousEnd.getUTCFullYear()}` };
  } else if (resolved.currentRange && (selection.period.kind === 'thisMonth' || selection.period.kind === 'thisYear')) {
    const comparison = resolveAnalyticsPeriodWindow(selection.period, resolved.currentRange.to, includePlannedMovements);
    resolved = {
      ...resolved,
      comparisonRange: comparison.comparisonRange,
      comparisonWindowLabel: comparison.comparisonWindowLabel,
    };
  }

  return resolved;
}
