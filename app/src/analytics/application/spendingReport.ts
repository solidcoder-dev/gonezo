import type { AnalyticsFilters, AnalyticsPeriod } from './analyticsFilters';
import { normalizeAnalyticsPeriodSelection, type AnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';
export { normalizeAnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type AnalyticsSpendingPeriodWindow = {
  start: string;
  endExclusive: string;
  selection: AnalyticsPeriodSelection;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export type AnalyticsMoneyDto = { value: string; currency: string };

export type AnalyticsSpendingTimelineBucket = {
  start: string;
  endExclusive: string;
  amount: AnalyticsMoneyDto;
  sequence: number;
};

export type AnalyticsSpendingCategory = {
  categoryId?: string;
  categoryName: string;
  amount: AnalyticsMoneyDto;
  percentage: number;
};

export type AnalyticsSpendingReport = {
  window: AnalyticsSpendingPeriodWindow;
  previousWindow?: AnalyticsSpendingPeriodWindow;
  currency: string;
  totalExpense: AnalyticsMoneyDto;
  previousExpense?: AnalyticsMoneyDto;
  changePercent?: number;
  timeline: AnalyticsSpendingTimelineBucket[];
  categories: AnalyticsSpendingCategory[];
  merchants?: AnalyticsSpendingMerchant[];
};

export type AnalyticsSpendingMovement = {
  id: string;
  occurredAt: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  currency: string;
  amount: string;
  categoryId?: string;
  description?: string;
  merchant?: string;
  merchantReference?: { key: string; displayName: string };
  categoryName?: string;
  items?: Array<{ amount: string; categoryId?: string; categoryName?: string }>;
};

export type AnalyticsCategoryReference = { id: string; name: string };

export type AnalyticsSpendingMerchant = {
  merchant: string;
  amount: AnalyticsMoneyDto;
  percentage: number;
  movementCount: number;
};

export type AnalyticsCategoryReadPort = {
  listCategories(): Promise<AnalyticsCategoryReference[]>;
};

export type AnalyticsSpendingReportPort = {
  listMovements(input: {
    filters: AnalyticsFilters;
    window: AnalyticsSpendingPeriodWindow;
  }): Promise<AnalyticsSpendingMovement[]>;
  listCategories: AnalyticsCategoryReadPort['listCategories'];
};

function dateAtStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = dateAtStart(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function addMonths(value: string, months: number): string {
  const date = dateAtStart(value);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())));
}

function periodRange(period: AnalyticsPeriod, reference: string, includePlannedMovements: boolean): { from: string; to: string } | undefined {
  switch (period.kind) {
    case 'allTime': return undefined;
    case 'thisMonth': {
      const date = dateAtStart(reference);
      const from = isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
      return { from, to: includePlannedMovements ? isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))) : reference };
    }
    case 'lastMonth': {
      const date = dateAtStart(reference);
      const from = isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
      return { from, to: isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0))) };
    }
    case 'thisYear': {
      const date = dateAtStart(reference);
      return { from: `${date.getUTCFullYear()}-01-01`, to: includePlannedMovements ? `${date.getUTCFullYear()}-12-31` : reference };
    }
    case 'rollingDays': return { from: addDays(reference, -(period.days - 1)), to: reference };
    case 'rollingMonths': return { from: addMonths(reference, -period.months), to: reference };
    case 'custom': return { from: period.from, to: period.to };
  }
}

function rangeToWindow(range: { from: string; to: string }, selection: AnalyticsPeriodSelection): AnalyticsSpendingPeriodWindow {
  return {
    start: range.from,
    endExclusive: addDays(range.to, 1),
    selection,
    canGoPrevious: true,
    canGoNext: selection.shift < 0,
  };
}

export function resolveAnalyticsSpendingWindow(
  input: AnalyticsPeriodSelection,
  now: string,
  earliestMovement?: string,
  includePlannedMovements = false,
): AnalyticsSpendingPeriodWindow {
  const selection = normalizeAnalyticsPeriodSelection(input);
  if (selection.period.kind === 'allTime') {
    const currentYear = dateAtStart(now).getUTCFullYear();
    const pageSize = 5;
    const end = `${currentYear + 1 + (selection.shift * pageSize)}-01-01`;
    const startCandidate = `${currentYear + (selection.shift * pageSize) - pageSize + 1}-01-01`;
    const earliest = earliestMovement ? `${dateAtStart(earliestMovement).getUTCFullYear()}-01-01` : `${currentYear}-01-01`;
    const start = startCandidate < earliest ? earliest : startCandidate;
    return { start, endExclusive: end, selection, canGoPrevious: earliest < startCandidate, canGoNext: selection.shift < 0 };
  }

  let period = selection.period;
  let reference = now;
  for (let index = 0; index > selection.shift; index -= 1) {
    const range = periodRange(period, reference, includePlannedMovements);
    if (!range) break;
    const days = Math.round((dateAtStart(range.to).getTime() - dateAtStart(range.from).getTime()) / 86_400_000) + 1;
    period = { kind: 'custom', from: addDays(range.from, -days), to: addDays(range.from, -1) };
    reference = period.to;
  }
  const range = periodRange(period, reference, includePlannedMovements);
  if (!range) throw new Error('Unable to resolve analytics spending window');
  return rangeToWindow(range, selection);
}

export function buildAnalyticsSpendingReport(input: {
  window: AnalyticsSpendingPeriodWindow;
  previousWindow?: AnalyticsSpendingPeriodWindow;
  currency: string;
  totalExpense: AnalyticsMoneyDto;
  previousExpense?: AnalyticsMoneyDto;
  changePercent?: number;
  timeline: AnalyticsSpendingTimelineBucket[];
  categories: AnalyticsSpendingCategory[];
  merchants?: AnalyticsSpendingMerchant[];
}): AnalyticsSpendingReport {
  return {
    window: input.window,
    previousWindow: input.previousWindow,
    currency: input.currency.toUpperCase(),
    totalExpense: input.totalExpense,
    previousExpense: input.previousExpense,
    changePercent: input.changePercent,
    timeline: input.timeline,
    categories: input.categories,
    merchants: input.merchants,
  };
}
