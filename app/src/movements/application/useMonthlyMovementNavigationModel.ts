import { useMemo, useState } from 'react';
import { monthEnd, monthLabel, monthStart, sameMonth } from './monthlyMovementCalendar';

type MonthlyMovementNavigationClock = {
  now(): Date;
};

type UseMonthlyMovementNavigationModelInput = {
  clock: MonthlyMovementNavigationClock;
  resetPage(): void;
};

export function useMonthlyMovementNavigationModel(input: UseMonthlyMovementNavigationModelInput) {
  const { clock, resetPage } = input;
  const [monthCursor, setMonthCursor] = useState<Date>(() => monthStart(clock.now()));
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => clock.now().getFullYear());

  const monthStartDate = useMemo(() => monthStart(monthCursor), [monthCursor]);
  const monthEndDate = useMemo(() => monthEnd(monthCursor), [monthCursor]);
  const currentMonth = useMemo(() => monthStart(clock.now()), [clock]);

  function resetPanels() {
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    setMonthPickerYear(monthCursor.getFullYear());
  }

  function goToPreviousMonth() {
    setMonthCursor((previous) => monthStart(new Date(previous.getFullYear(), previous.getMonth() - 1, 1)));
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  function goToCurrentMonth() {
    const target = monthStart(clock.now());
    setMonthCursor(target);
    setMonthPickerYear(target.getFullYear());
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  function goToNextMonth() {
    setMonthCursor((previous) => monthStart(new Date(previous.getFullYear(), previous.getMonth() + 1, 1)));
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  function toggleMonthMenu() {
    setMonthPickerOpen(false);
    setMonthMenuOpen((previous) => !previous);
  }

  function openMonthPicker() {
    setMonthMenuOpen(false);
    setMonthPickerYear(monthCursor.getFullYear());
    setMonthPickerOpen(true);
  }

  function selectPickerMonth(monthIndex: number) {
    setMonthCursor(monthStart(new Date(monthPickerYear, monthIndex, 1)));
    setMonthMenuOpen(false);
    setMonthPickerOpen(false);
    resetPage();
  }

  return {
    state: {
      monthCursor,
      monthStartDate,
      monthEndDate,
      monthLabel: monthLabel(monthCursor),
      isCurrentMonth: sameMonth(monthCursor, currentMonth),
      monthMenuOpen,
      monthPickerOpen,
      monthPickerYear,
      viewedMonthIndex: monthCursor.getMonth(),
      viewedYear: monthCursor.getFullYear(),
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
