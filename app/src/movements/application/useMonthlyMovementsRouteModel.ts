import { useState } from 'react';
import type { MonthlyMovementsMode } from '../ui/MonthlyMovements/MonthlyMovementsView.contract';
import type { MonthlyMovementsRouteState } from './monthlyMovementsRouteState';
import { useMonthlyMovementNavigationModel } from './useMonthlyMovementNavigationModel';

type UseMonthlyMovementsRouteModelInput = {
  clock: { now(): Date };
  resetPage(): void;
  routeState?: MonthlyMovementsRouteState;
  onRouteStateChange?: (state: MonthlyMovementsRouteState) => void;
};

export function useMonthlyMovementsRouteModel(input: UseMonthlyMovementsRouteModelInput) {
  const [localSelectedMode, setLocalSelectedMode] = useState<MonthlyMovementsMode>('posted');
  const navigation = useMonthlyMovementNavigationModel({
    clock: input.clock,
    resetPage: input.resetPage,
    routeState: input.routeState,
    onRouteStateChange: input.routeState && input.onRouteStateChange
      ? (state) => input.onRouteStateChange?.({ month: state.month, mode: input.routeState?.mode ?? 'posted' })
      : undefined,
  });

  return {
    navigation,
    selectedMode: input.routeState?.mode ?? localSelectedMode,
    selectMode: (mode: MonthlyMovementsMode) => {
      if (input.onRouteStateChange && input.routeState) {
        input.onRouteStateChange({ month: input.routeState.month, mode });
      } else {
        setLocalSelectedMode(mode);
      }
    },
  };
}
