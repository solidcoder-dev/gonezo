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
  categoryName?: string;
  items?: Array<{ amount: string; categoryId?: string; categoryName?: string }>;
};

export type AnalyticsCategoryReference = { id: string; name: string };

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

function addYears(value: string, years: number): string {
  const date = dateAtStart(value);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate())));
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

function cents(value: string): number {
  const normalized = value.trim();
  const sign = normalized.startsWith('-') ? -1 : 1;
  const unsigned = normalized.replace(/^[+-]/, '');
  const [whole, fraction = ''] = unsigned.split('.');
  return sign * ((Number(whole || 0) * 100) + Number((fraction + '00').slice(0, 2)));
}

function money(value: number, currency: string): AnalyticsMoneyDto {
  return { value: (value / 100).toFixed(2), currency };
}

function expenseMovements(movements: AnalyticsSpendingMovement[], window: AnalyticsSpendingPeriodWindow, currency: string): AnalyticsSpendingMovement[] {
  const start = dateAtStart(window.start).getTime();
  const end = dateAtStart(window.endExclusive).getTime();
  return movements.filter((movement) => movement.type === 'expense'
    && movement.currency.toUpperCase() === currency
    && dateAtStart(movement.occurredAt.slice(0, 10)).getTime() >= start
    && dateAtStart(movement.occurredAt.slice(0, 10)).getTime() < end);
}

export function calculateSpendingTotals(movements: AnalyticsSpendingMovement[], currency: string): AnalyticsMoneyDto {
  return money(movements.reduce((sum, movement) => sum + cents(movement.amount), 0), currency);
}

export function buildSpendingTimeline(movements: AnalyticsSpendingMovement[], window: AnalyticsSpendingPeriodWindow, currency: string): AnalyticsSpendingTimelineBucket[] {
  const days = Math.round((dateAtStart(window.endExclusive).getTime() - dateAtStart(window.start).getTime()) / 86_400_000);
  const unit = days <= 14 ? 'day' : days <= 93 ? 'week' : days <= 730 ? 'month' : 'year';
  const buckets: AnalyticsSpendingTimelineBucket[] = [];
  let start = window.start;
  while (start < window.endExclusive) {
    const next = unit === 'day' ? addDays(start, 1) : unit === 'week' ? addDays(start, 7) : unit === 'month' ? addMonths(start, 1) : addYears(start, 1);
    buckets.push({ start, endExclusive: next < window.endExclusive ? next : window.endExclusive, amount: money(0, currency), sequence: buckets.length });
    start = next;
  }
  for (const movement of expenseMovements(movements, window, currency)) {
    const occurred = movement.occurredAt.slice(0, 10);
    const bucket = buckets.find((candidate) => occurred >= candidate.start && occurred < candidate.endExclusive);
    if (bucket) bucket.amount = money(cents(bucket.amount.value) + cents(movement.amount), currency);
  }
  return buckets;
}

export function buildSpendingCategories(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
  references: AnalyticsCategoryReference[],
): AnalyticsSpendingCategory[] {
  const byId = new Map(references.map((reference) => [reference.id, reference.name]));
  const amounts = new Map<string, number>();
  for (const movement of expenseMovements(movements, window, currency)) {
    const allocations = movement.items && movement.items.length > 0 ? movement.items : [{ amount: movement.amount, categoryId: movement.categoryId, categoryName: movement.categoryName }];
    for (const allocation of allocations) {
      const id = allocation.categoryId;
      const key = id ?? 'uncategorized';
      amounts.set(key, (amounts.get(key) ?? 0) + cents(allocation.amount));
    }
  }
  const total = [...amounts.values()].reduce((sum, value) => sum + value, 0);
  return [...amounts.entries()].sort((left, right) => right[1] - left[1]).map(([id, value]) => ({
    categoryId: id === 'uncategorized' ? undefined : id,
    categoryName: id === 'uncategorized' ? 'Uncategorized' : byId.get(id) ?? 'Uncategorized',
    amount: money(value, currency),
    percentage: total === 0 ? 0 : (value / total) * 100,
  }));
}

export function calculateChangePercent(current: AnalyticsMoneyDto, previous?: AnalyticsMoneyDto): number | undefined {
  if (!previous || cents(previous.value) === 0) return undefined;
  return ((cents(current.value) - cents(previous.value)) / cents(previous.value)) * 100;
}

export function buildAnalyticsSpendingReport(input: {
  window: AnalyticsSpendingPeriodWindow;
  previousWindow?: AnalyticsSpendingPeriodWindow;
  currency: string;
  currentMovements: AnalyticsSpendingMovement[];
  previousMovements: AnalyticsSpendingMovement[];
  categories: AnalyticsCategoryReference[];
}): AnalyticsSpendingReport {
  const current = expenseMovements(input.currentMovements, input.window, input.currency.toUpperCase());
  const totalExpense = calculateSpendingTotals(current, input.currency.toUpperCase());
  const previousExpense = input.previousWindow ? calculateSpendingTotals(expenseMovements(input.previousMovements, input.previousWindow, input.currency.toUpperCase()), input.currency.toUpperCase()) : undefined;
  return {
    window: input.window,
    previousWindow: input.previousWindow,
    currency: input.currency.toUpperCase(),
    totalExpense,
    previousExpense,
    changePercent: calculateChangePercent(totalExpense, previousExpense),
    timeline: buildSpendingTimeline(current, input.window, input.currency.toUpperCase()),
    categories: buildSpendingCategories(current, input.window, input.currency.toUpperCase(), input.categories),
  };
}
