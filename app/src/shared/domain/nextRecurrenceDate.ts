import type {
  RecurrenceFrequencyView,
  RecurrenceMonthlyPatternView,
} from './schedulingView.types';

export type NextRecurrenceDateInput = {
  fromDate: string;
  frequency: RecurrenceFrequencyView;
  interval: string;
  weeklyDay: string;
  monthlyPattern: RecurrenceMonthlyPatternView;
  dayOfMonth: string;
  monthlyOrdinal: string;
  monthlyWeekday: string;
};

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizedInteger(value: string, fallback: number, min: number, max?: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || (max != null && parsed > max)) {
    return fallback;
  }
  return parsed;
}

function isoWeekday(value: Date): number {
  const day = value.getUTCDay();
  return day === 0 ? 7 : day;
}

function startOfIsoWeek(value: Date): Date {
  const start = new Date(value);
  start.setUTCDate(start.getUTCDate() - (isoWeekday(start) - 1));
  return start;
}

function addUtcMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function dayOfMonthCandidate(month: Date, preferredDay: number): Date {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(preferredDay, lastDay)));
}

function nthWeekdayCandidate(month: Date, weekday: number, ordinal: number): Date {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - isoWeekday(firstOfMonth) + 7) % 7;
  const candidate = new Date(Date.UTC(year, monthIndex, 1 + offset + ((ordinal - 1) * 7)));
  if (candidate.getUTCMonth() !== monthIndex) {
    candidate.setUTCDate(candidate.getUTCDate() - 7);
  }
  return candidate;
}

export function nextRecurrenceDateIso(input: NextRecurrenceDateInput): string | undefined {
  const fromDate = parseIsoDate(input.fromDate);
  if (!fromDate) {
    return undefined;
  }

  const interval = normalizedInteger(input.interval, 1, 1);
  if (input.frequency === 'daily' || input.frequency === 'yearly') {
    return formatIsoDate(fromDate);
  }

  if (input.frequency === 'weekly') {
    const weekday = normalizedInteger(input.weeklyDay, isoWeekday(fromDate), 1, 7);
    const weekStart = startOfIsoWeek(fromDate);
    const candidate = new Date(weekStart);
    candidate.setUTCDate(candidate.getUTCDate() + weekday - 1);
    if (candidate >= fromDate) {
      return formatIsoDate(candidate);
    }
    candidate.setUTCDate(candidate.getUTCDate() + (interval * 7));
    return formatIsoDate(candidate);
  }

  const currentMonth = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1));
  const candidateForMonth = (month: Date) => input.monthlyPattern === 'nth_weekday'
    ? nthWeekdayCandidate(
      month,
      normalizedInteger(input.monthlyWeekday, isoWeekday(fromDate), 1, 7),
      normalizedInteger(input.monthlyOrdinal, 1, 1, 5),
    )
    : dayOfMonthCandidate(month, normalizedInteger(input.dayOfMonth, fromDate.getUTCDate(), 1, 31));
  let candidate = candidateForMonth(currentMonth);
  if (candidate < fromDate) {
    candidate = candidateForMonth(addUtcMonths(currentMonth, interval));
  }
  return formatIsoDate(candidate);
}
