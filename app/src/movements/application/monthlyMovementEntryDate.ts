import { monthlyMovementsMonthToDate } from './monthlyMovementsRouteState';

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthlyMovementEntryDate(month: string | undefined, today: Date): string {
  const targetMonth = month ? monthlyMovementsMonthToDate(month) : today;
  const year = targetMonth.getFullYear();
  const monthIndex = targetMonth.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return formatLocalDate(new Date(year, monthIndex, day));
}
