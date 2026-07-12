import type { AnalyticsLocalDate, AnalyticsPeriod } from './analyticsFilters';

export type AnalyticsLocalDateRange = {
  from: AnalyticsLocalDate;
  to: AnalyticsLocalDate;
};

export type AnalyticsResolvedPeriodWindow = {
  currentRange?: AnalyticsLocalDateRange;
  comparisonRange?: AnalyticsLocalDateRange;
  currentWindowLabel: string;
  comparisonWindowLabel?: string;
};

function parseLocalDate(value: AnalyticsLocalDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatLocalDate(date: Date): AnalyticsLocalDate {
  return date.toISOString().slice(0, 10);
}

function addDays(value: AnalyticsLocalDate, days: number): AnalyticsLocalDate {
  const date = parseLocalDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatLocalDate(date);
}

function startOfMonth(value: AnalyticsLocalDate): AnalyticsLocalDate {
  const date = parseLocalDate(value);
  return formatLocalDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
}

function endOfMonth(value: AnalyticsLocalDate): AnalyticsLocalDate {
  const date = parseLocalDate(value);
  return formatLocalDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

function startOfYear(value: AnalyticsLocalDate): AnalyticsLocalDate {
  const date = parseLocalDate(value);
  return formatLocalDate(new Date(Date.UTC(date.getUTCFullYear(), 0, 1)));
}

function previousMonth(value: AnalyticsLocalDate): AnalyticsLocalDate {
  const date = parseLocalDate(value);
  return formatLocalDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

function clampDay(year: number, monthIndex: number, day: number): AnalyticsLocalDate {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return formatLocalDate(new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay))));
}

function inclusiveDays(range: AnalyticsLocalDateRange): number {
  const delta = parseLocalDate(range.to).getTime() - parseLocalDate(range.from).getTime();
  return Math.round(delta / 86_400_000) + 1;
}

function previousEquivalentRange(range: AnalyticsLocalDateRange): AnalyticsLocalDateRange {
  const days = inclusiveDays(range);
  const to = addDays(range.from, -1);
  return {
    from: addDays(to, -(days - 1)),
    to,
  };
}

function monthDayLabel(value: AnalyticsLocalDate): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parseLocalDate(value));
}

function rangeLabel(range: AnalyticsLocalDateRange): string {
  const fromDate = parseLocalDate(range.from);
  const toDate = parseLocalDate(range.to);
  return fromDate.getUTCFullYear() === toDate.getUTCFullYear()
    ? `${monthDayLabel(range.from)}-${monthDayLabel(range.to)}, ${toDate.getUTCFullYear()}`
    : `${monthDayLabel(range.from)}, ${fromDate.getUTCFullYear()}-${monthDayLabel(range.to)}, ${toDate.getUTCFullYear()}`;
}

function resolveCurrentRange(period: AnalyticsPeriod, referenceDate: AnalyticsLocalDate): AnalyticsLocalDateRange | undefined {
  switch (period.kind) {
    case 'thisMonth':
      return { from: startOfMonth(referenceDate), to: referenceDate };
    case 'lastMonth': {
      const month = previousMonth(referenceDate);
      return { from: startOfMonth(month), to: endOfMonth(month) };
    }
    case 'rollingDays':
      return { from: addDays(period.anchorDate, -(period.days - 1)), to: period.anchorDate };
    case 'rollingMonths': {
      const anchor = parseLocalDate(period.anchorDate);
      return {
        from: formatLocalDate(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (period.months - 1), 1))),
        to: period.anchorDate,
      };
    }
    case 'thisYear':
      return { from: startOfYear(referenceDate), to: referenceDate };
    case 'custom':
      if (parseLocalDate(period.from).getTime() > parseLocalDate(period.to).getTime()) {
        throw new Error('Analytics custom period requires from <= to');
      }
      return { from: period.from, to: period.to };
    case 'allTime':
      return undefined;
  }
}

function resolveComparisonRange(period: AnalyticsPeriod, referenceDate: AnalyticsLocalDate, currentRange?: AnalyticsLocalDateRange) {
  if (!currentRange) {
    return undefined;
  }
  switch (period.kind) {
    case 'thisMonth': {
      const reference = parseLocalDate(referenceDate);
      const previousMonthDate = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
      const from = formatLocalDate(previousMonthDate);
      const to = clampDay(previousMonthDate.getUTCFullYear(), previousMonthDate.getUTCMonth(), reference.getUTCDate());
      return { from, to };
    }
    case 'lastMonth': {
      const month = previousMonth(currentRange.from);
      return { from: startOfMonth(month), to: endOfMonth(month) };
    }
    case 'rollingDays':
    case 'rollingMonths':
    case 'custom':
      return previousEquivalentRange(currentRange);
    case 'thisYear': {
      const reference = parseLocalDate(referenceDate);
      const previousYear = reference.getUTCFullYear() - 1;
      return {
        from: `${previousYear}-01-01`,
        to: clampDay(previousYear, reference.getUTCMonth(), reference.getUTCDate()),
      };
    }
    case 'allTime':
      return undefined;
  }
}

export function resolveAnalyticsPeriodWindow(
  period: AnalyticsPeriod,
  referenceDate: AnalyticsLocalDate,
): AnalyticsResolvedPeriodWindow {
  const currentRange = resolveCurrentRange(period, referenceDate);
  const comparisonRange = resolveComparisonRange(period, referenceDate, currentRange);

  return {
    currentRange,
    comparisonRange,
    currentWindowLabel: currentRange ? rangeLabel(currentRange) : 'All time',
    comparisonWindowLabel: comparisonRange ? rangeLabel(comparisonRange) : undefined,
  };
}
