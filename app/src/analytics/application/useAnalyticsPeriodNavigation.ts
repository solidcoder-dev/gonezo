import { useCallback, useMemo, useState } from 'react';
import { analyticsReferenceDateFromNow, normalizeAnalyticsPeriodInput, type AnalyticsPeriod } from './analyticsFilters';
import { normalizeAnalyticsPeriodSelection, resolveAnalyticsPeriodSelectionWindow, type AnalyticsPeriodSelection } from './analyticsPeriodSelection';
import type { AnalyticsPeriodNavigationViewModel } from '../ui/AnalyticsPeriodNavigator/AnalyticsPeriodNavigator';

export type AnalyticsPeriodNavigation = AnalyticsPeriodNavigationViewModel & {
  periodSelection: AnalyticsPeriodSelection;
};

export function useAnalyticsPeriodNavigation(period: AnalyticsPeriod, initialShift = 0, includePlannedMovements = false): AnalyticsPeriodNavigation {
  const normalizedPeriod = useMemo(() => normalizeAnalyticsPeriodInput(period), [period]);
  const periodKey = JSON.stringify(normalizedPeriod);
  const [navigationState, setNavigationState] = useState(() => ({ periodKey, shift: Math.min(0, Math.trunc(initialShift)) }));
  const shift = navigationState.periodKey === periodKey ? navigationState.shift : 0;
  const periodSelection = useMemo(() => ({ period: normalizedPeriod, shift }), [normalizedPeriod, shift]);
  const resolvedWindow = useMemo(
    () => resolveAnalyticsPeriodSelectionWindow(periodSelection, analyticsReferenceDateFromNow(), includePlannedMovements),
    [includePlannedMovements, periodSelection],
  );
  const canNavigate = normalizedPeriod.kind !== 'allTime';

  const goPrevious = useCallback(() => {
    if (canNavigate) setNavigationState((current) => ({ periodKey, shift: (current.periodKey === periodKey ? current.shift : 0) - 1 }));
  }, [canNavigate, periodKey]);
  const goNext = useCallback(() => {
    if (canNavigate) setNavigationState((current) => ({ periodKey, shift: Math.min(0, (current.periodKey === periodKey ? current.shift : 0) + 1) }));
  }, [canNavigate, periodKey]);

  return {
    periodSelection,
    currentWindowLabel: resolvedWindow.currentWindowLabel,
    canGoPrevious: canNavigate,
    canGoNext: canNavigate && shift < 0,
    goPrevious,
    goNext,
  };
}

export function resetAnalyticsPeriodShift(period: AnalyticsPeriod): AnalyticsPeriodSelection {
  return normalizeAnalyticsPeriodSelection({ period, shift: 0 });
}
