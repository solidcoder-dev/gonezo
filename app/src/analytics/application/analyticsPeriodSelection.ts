import type { AnalyticsPeriod } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';

export type AnalyticsPeriodSelection = { period: AnalyticsPeriod; shift: number };

export function normalizeAnalyticsPeriodSelection(input: Partial<AnalyticsPeriodSelection> & { period: AnalyticsPeriod }): AnalyticsPeriodSelection {
  return { period: normalizeAnalyticsPeriodInput(input.period), shift: Math.min(0, Math.trunc(input.shift ?? 0)) };
}
