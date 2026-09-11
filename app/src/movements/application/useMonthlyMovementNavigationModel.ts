import { useMemo, useState } from 'react';
import { monthEnd, monthLabel, monthStart, sameMonth } from './monthlyMovementCalendar';
import type { MonthlyMovementsRouteState } from './monthlyMovementsRouteState';
import { monthlyMovementsMonthToDate } from './monthlyMovementsRouteState';

type MonthlyMovementNavigationClock = {
  now(): Date;
};

type UseMonthlyMovementNavigationModelInput = {
  clock: MonthlyMovementNavigationClock;
  resetPage(): void;
  routeState?: Pick<MonthlyMovementsRouteState, 'month'>;
  onRouteStateChange?: (state: Pick<MonthlyMovementsRouteState, 'month'>) => void;
};

export function useMonthlyMovementNavigationModel(input: UseMonthlyMovementNavigationModelInput) {
  const { clock, resetPage, routeState, onRouteStateChange } = input;
  const [monthCursor, setMonthCursor] = useState<Date>(() => monthStart(clock.now()));
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => clock.now().getFullYear());

  const effectiveMonthCursor = routeState ? monthlyMovementsMonthToDate(routeState.month) : monthCursor;
  const monthStartDate = useMemo(() => monthStart(effectiveMonthCursor), [effectiveMonthCursor]);
  const monthEndDate = useMemo(() => monthEnd(effectiveMonthCursor), [effectiveMonthCursor]);
  const currentMonth = useMemo(() => monthStart(clock.now()), [clock]);

  function resetPanels() {
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    setMonthPickerYear(effectiveMonthCursor.getFullYear());
  }

  function changeMonth(target: Date) {
    const nextMonth = monthStart(target);
    if (onRouteStateChange) {
      onRouteStateChange({ month: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}` });
    } else {
      setMonthCursor(nextMonth);
    }
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  function goToPreviousMonth() {
    changeMonth(new Date(effectiveMonthCursor.getFullYear(), effectiveMonthCursor.getMonth() - 1, 1));
  }

  function goToCurrentMonth() {
    const target = monthStart(clock.now());
    if (onRouteStateChange) {
      onRouteStateChange({ month: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}` });
    } else {
      setMonthCursor(target);
    }
    setMonthPickerYear(target.getFullYear());
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  function goToNextMonth() {
    changeMonth(new Date(effectiveMonthCursor.getFullYear(), effectiveMonthCursor.getMonth() + 1, 1));
  }

  function toggleMonthMenu() {
    setMonthPickerOpen(false);
    setMonthMenuOpen((previous) => !previous);
  }

  function openMonthPicker() {
    setMonthMenuOpen(false);
    setMonthPickerYear(effectiveMonthCursor.getFullYear());
    setMonthPickerOpen(true);
  }

  function selectPickerMonth(monthIndex: number) {
    changeMonth(new Date(monthPickerYear, monthIndex, 1));
  }

  return {
    state: {
      monthCursor: effectiveMonthCursor,
      monthStartDate,
      monthEndDate,
      monthLabel: monthLabel(effectiveMonthCursor),
      isCurrentMonth: sameMonth(effectiveMonthCursor, currentMonth),
      monthMenuOpen,
      monthPickerOpen,
      monthPickerYear,
      viewedMonthIndex: effectiveMonthCursor.getMonth(),
      viewedYear: effectiveMonthCursor.getFullYear(),
      currentMonthIndex: currentMonth.getMonth(),
      currentYear: currentMonth.getFullYear(),
    },
    actions: {
      resetPanels,
      goToPreviousMonth,
      goToCurrentMonth,
      goToNextMonth,
      toggleMonthMenu,
      closeMonthMenu: () => setMonthMenuOpen(false),
      openMonthPicker,
      closeMonthPicker: () => setMonthPickerOpen(false),
      goToPreviousPickerYear: () => setMonthPickerYear((previous) => previous - 1),
      goToNextPickerYear: () => setMonthPickerYear((previous) => previous + 1),
      selectPickerMonth,
    },
  };
}
