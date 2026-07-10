import type {
  OrchestrationTransactionTaxonomyItem,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
} from '../../taxonomy/application/taxonomy.port';
import type { LedgerAccountItem, LedgerCashFlowGranularity, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import type {
  AnalyticsCashFlowSummaryResult,
  AnalyticsFlowInsightsResult,
  AnalyticsFlowProjectionPoint,
  AnalyticsFlowProjectionResult,
  AnalyticsFlowUpcomingItem,
  AnalyticsFlowUpcomingResult,
  AnalyticsOverviewHighlight,
  AnalyticsOverviewInsightItem,
  AnalyticsOverviewInsightsResult,
  AnalyticsOverviewSnapshotResult,
  AnalyticsPeriodWindow,
  AnalyticsSpendingDashboardResult,
  AnalyticsSpendingOverviewResult,
  AnalyticsSpendingTimelinePoint,
  AnalyticsSpendingTimelineResult,
  AnalyticsSpendingTopExpensesResult,
} from './analytics.port';
import type { AnalyticsPeriodPreset } from './analyticsFilters';
import { buildOverviewInsightsResult } from './overviewInsights';

const UNCATEGORIZED = 'Uncategorized';
const OPENING_BALANCE_DESCRIPTION = 'opening balance';

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function subtractAmount(left: string, right: string): string {
  return (Number(left) - Number(right)).toFixed(2);
}

function selectedCurrency(input: string): string {
  return input.trim().toUpperCase();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addUtcYears(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, 0, 1));
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay() || 7;
  return addUtcDays(startOfUtcDay(date), 1 - day);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date);
}

function monthDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function rangeLabel(start: Date, end: Date, granularity: LedgerCashFlowGranularity): string {
  const last = addUtcDays(end, -1);
  if (granularity === 'yearly') {
    return `${start.getUTCFullYear()} - ${last.getUTCFullYear()}`;
  }
  if (granularity === 'monthly') {
    if (start.getUTCFullYear() === last.getUTCFullYear() && start.getUTCMonth() === last.getUTCMonth()) {
      return `${monthLabel(start)} ${start.getUTCFullYear()}`;
    }
    return `${monthLabel(start)} ${start.getUTCFullYear()} - ${monthLabel(last)} ${last.getUTCFullYear()}`;
  }
  return `${dayLabel(start)} - ${dayLabel(last)}`;
}

function endInclusive(endExclusive: Date): Date {
  return new Date(endExclusive.getTime() - 1);
}

function overviewRangeLabel(start: Date, endExclusive: Date): string {
  const end = endInclusive(endExclusive);
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${monthDayLabel(start)}-${monthDayLabel(end)}, ${end.getUTCFullYear()}`;
  }
  return `${monthDayLabel(start)}, ${start.getUTCFullYear()}-${monthDayLabel(end)}, ${end.getUTCFullYear()}`;
}

export function buildAnalyticsPeriodWindow(
  granularity: LedgerCashFlowGranularity,
  now: Date,
  inputPeriodOffset = 0,
): AnalyticsPeriodWindow & { start: Date; end: Date } {
  const periodOffset = Math.min(0, Math.trunc(inputPeriodOffset));
  if (granularity === 'daily') {
    const start = addUtcDays(startOfUtcDay(now), periodOffset);
    const end = addUtcDays(start, 1);
    return { start, end, label: dayLabel(start), periodOffset, canGoPrevious: true, canGoNext: periodOffset < 0 };
  }
  if (granularity === 'weekly') {
    const start = addUtcDays(startOfUtcWeek(now), periodOffset * 7);
    const end = addUtcDays(start, 7);
    return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoPrevious: true, canGoNext: periodOffset < 0 };
  }
  if (granularity === 'monthly') {
    const start = addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), periodOffset);
    const end = addUtcMonths(start, 1);
    return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoPrevious: true, canGoNext: periodOffset < 0 };
  }
  const start = addUtcYears(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), periodOffset);
  const end = addUtcYears(start, 1);
  return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoPrevious: true, canGoNext: periodOffset < 0 };
}

export type AnalyticsOverviewWindowRange = {
  label: string;
  start: Date;
  end: Date;
};

export type AnalyticsNavigableWindowRange = AnalyticsOverviewWindowRange & {
  periodOffset: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

export function buildAnalyticsOverviewWindows(
  period: AnalyticsPeriodPreset,
  now: Date,
  earliestOccurredAt?: Date,
): { currentWindow: AnalyticsOverviewWindowRange; previousWindow?: AnalyticsOverviewWindowRange } {
  if (period === '7D') {
    const currentStart = addUtcDays(startOfUtcDay(now), -6);
    const currentEnd = addUtcDays(startOfUtcDay(now), 1);
    const previousStart = addUtcDays(currentStart, -7);
    return {
      currentWindow: { start: currentStart, end: currentEnd, label: overviewRangeLabel(currentStart, currentEnd) },
      previousWindow: { start: previousStart, end: currentStart, label: overviewRangeLabel(previousStart, currentStart) },
    };
  }

  if (period === '30D') {
    const currentEnd = addUtcDays(startOfUtcDay(now), 1);
    const currentStart = addUtcDays(currentEnd, -30);
    const previousStart = addUtcDays(currentStart, -30);
    return {
      currentWindow: { start: currentStart, end: currentEnd, label: overviewRangeLabel(currentStart, currentEnd) },
      previousWindow: { start: previousStart, end: currentStart, label: overviewRangeLabel(previousStart, currentStart) },
    };
  }

  if (period === '90D') {
    const currentEnd = addUtcDays(startOfUtcDay(now), 1);
    const currentStart = addUtcDays(currentEnd, -90);
    const previousStart = addUtcDays(currentStart, -90);
    return {
      currentWindow: { start: currentStart, end: currentEnd, label: overviewRangeLabel(currentStart, currentEnd) },
      previousWindow: { start: previousStart, end: currentStart, label: overviewRangeLabel(previousStart, currentStart) },
    };
  }

  if (period === 'ALL') {
    const currentStart = earliestOccurredAt ? startOfUtcDay(earliestOccurredAt) : startOfUtcDay(now);
    const currentEnd = addUtcDays(startOfUtcDay(now), 1);
    return {
      currentWindow: {
        start: currentStart,
        end: currentEnd,
        label: 'All time',
      },
    };
  }

  const currentEnd = addUtcMonths(startOfUtcMonth(now), 1);
  const currentStart = addUtcMonths(currentEnd, -12);
  const previousEnd = currentStart;
  const previousStart = addUtcMonths(previousEnd, -12);
  return {
    currentWindow: { start: currentStart, end: currentEnd, label: overviewRangeLabel(currentStart, currentEnd) },
    previousWindow: { start: previousStart, end: previousEnd, label: overviewRangeLabel(previousStart, previousEnd) },
  };
}

export function buildSpendingTimelineWindow(
  period: AnalyticsPeriodPreset,
  now: Date,
  inputPeriodOffset = 0,
  earliestOccurredAt?: Date,
  allPeriodYearPageSize = 5,
): AnalyticsNavigableWindowRange {
  const periodOffset = Math.min(0, Math.trunc(inputPeriodOffset));

  if (period === '7D') {
    const currentEnd = addUtcDays(startOfUtcDay(now), 1 + (periodOffset * 7));
    const currentStart = addUtcDays(currentEnd, -7);
    return {
      start: currentStart,
      end: currentEnd,
      label: overviewRangeLabel(currentStart, currentEnd),
      periodOffset,
      canGoPrevious: true,
      canGoNext: periodOffset < 0,
    };
  }

  if (period === '30D') {
    const currentEnd = addUtcDays(startOfUtcDay(now), 1 + (periodOffset * 30));
    const currentStart = addUtcDays(currentEnd, -30);
    return {
      start: currentStart,
      end: currentEnd,
      label: overviewRangeLabel(currentStart, currentEnd),
      periodOffset,
      canGoPrevious: true,
      canGoNext: periodOffset < 0,
    };
  }

  if (period === '90D') {
    const currentEnd = addUtcDays(startOfUtcDay(now), 1 + (periodOffset * 90));
    const currentStart = addUtcDays(currentEnd, -90);
    return {
      start: currentStart,
      end: currentEnd,
      label: overviewRangeLabel(currentStart, currentEnd),
      periodOffset,
      canGoPrevious: true,
      canGoNext: periodOffset < 0,
    };
  }

  if (period === '1Y') {
    const currentEnd = addUtcMonths(startOfUtcMonth(now), 1 + (periodOffset * 12));
    const currentStart = addUtcMonths(currentEnd, -12);
    return {
      start: currentStart,
      end: currentEnd,
      label: overviewRangeLabel(currentStart, currentEnd),
      periodOffset,
      canGoPrevious: true,
      canGoNext: periodOffset < 0,
    };
  }

  const pageSize = Math.max(5, Math.min(12, Math.trunc(allPeriodYearPageSize)));
  const latestYearEnd = addUtcYears(startOfUtcYear(now), 1 + (periodOffset * pageSize));
  const latestYearStart = addUtcYears(latestYearEnd, -pageSize);
  const earliestYearStart = earliestOccurredAt ? startOfUtcYear(earliestOccurredAt) : startOfUtcYear(now);
  const windowStart = latestYearStart < earliestYearStart ? earliestYearStart : latestYearStart;

  return {
    start: windowStart,
    end: latestYearEnd,
    label: rangeLabel(windowStart, latestYearEnd, 'yearly'),
    periodOffset,
    canGoPrevious: earliestYearStart < latestYearStart,
    canGoNext: periodOffset < 0,
  };
}

function buildAnalyticsMonthRangeWindow(
  months: number,
  now: Date,
  inputPeriodOffset = 0,
): AnalyticsPeriodWindow & { start: Date; end: Date } {
  const periodOffset = Math.min(0, Math.trunc(inputPeriodOffset));
  const count = Number.isFinite(months) && months > 0 ? Math.min(Math.trunc(months), 24) : 6;
  const current = addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), periodOffset * count);
  const start = addUtcMonths(current, -(count - 1));
  const end = addUtcMonths(start, count);
  return {
    start,
    end,
    label: rangeLabel(start, end, 'monthly'),
    periodOffset,
    canGoPrevious: true,
    canGoNext: periodOffset < 0,
  };
}

function isAutomaticOpeningBalance(transaction: LedgerTransactionListItem): boolean {
  return transaction.description?.trim().toLowerCase() === OPENING_BALANCE_DESCRIPTION
    && !transaction.merchant
    && !transaction.categoryId
    && transaction.items.length === 0;
}

function isAnalyticsCashFlowTransaction(transaction: LedgerTransactionListItem, currency: string): boolean {
  return transaction.status === 'posted'
    && (transaction.type === 'income' || transaction.type === 'expense')
    && transaction.currency.toUpperCase() === currency
    && !isAutomaticOpeningBalance(transaction);
}

export function listAnalyticsCurrencies(accounts: LedgerAccountItem[], preferredCurrency?: string): string[] {
  const currencies = [...new Set(accounts.map((account) => account.currency.toUpperCase()))].sort();
  const normalizedPreferredCurrency = preferredCurrency?.trim().toUpperCase();
  if (!normalizedPreferredCurrency || !currencies.includes(normalizedPreferredCurrency)) {
    return currencies;
  }
  return [
    normalizedPreferredCurrency,
    ...currencies.filter((currency) => currency !== normalizedPreferredCurrency),
  ];
}

export function buildAnalyticsCashFlowSummary(
  transactions: LedgerTransactionListItem[],
  currencyInput: string,
): AnalyticsCashFlowSummaryResult {
  const currency = selectedCurrency(currencyInput);
  const totals = transactions
    .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency))
    .reduce(
      (current, transaction) => {
        if (transaction.type === 'income') {
          return { ...current, incomeAmount: addAmount(current.incomeAmount, transaction.amount) };
        }
        return { ...current, expenseAmount: addAmount(current.expenseAmount, transaction.amount) };
      },
      { incomeAmount: '0.00', expenseAmount: '0.00' },
    );

  return {
    ...totals,
    netFlowAmount: addAmount(totals.incomeAmount, (-Number(totals.expenseAmount)).toFixed(2)),
  };
}

function analyticsHighlightTitle(transaction: LedgerTransactionListItem): string {
  const description = transaction.description?.trim();
  if (description) {
    return description;
  }
  const merchant = transaction.merchant?.trim();
  if (merchant) {
    return merchant;
  }
  const categoryName = transaction.category?.name?.trim();
  if (categoryName) {
    return categoryName;
  }
  return transaction.type === 'expense' ? 'Expense' : 'Income';
}

function analyticsHighlightSubtitle(transaction: LedgerTransactionListItem): string | undefined {
  const description = transaction.description?.trim();
  const merchant = transaction.merchant?.trim();
  if (description && merchant) {
    return merchant;
  }
  return undefined;
}

function toOverviewHighlight(transaction: LedgerTransactionListItem | undefined): AnalyticsOverviewHighlight | undefined {
  if (!transaction) {
    return undefined;
  }
  return {
    movementId: transaction.id,
    title: analyticsHighlightTitle(transaction),
    subtitle: analyticsHighlightSubtitle(transaction),
    amount: transaction.amount,
    occurredAt: transaction.occurredAt,
  };
}

function byAmountDescending(left: LedgerTransactionListItem, right: LedgerTransactionListItem): number {
  return Number(right.amount) - Number(left.amount);
}

function selectBiggestMovement(
  transactions: LedgerTransactionListItem[],
  currency: string,
  type: 'income' | 'expense',
): LedgerTransactionListItem | undefined {
  return transactions
    .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && transaction.type === type)
    .sort(byAmountDescending)[0];
}

function percentChange(currentAmount: string, previousAmount: string): string | undefined {
  const previous = Number(previousAmount);
  const current = Number(currentAmount);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) {
    return undefined;
  }
  return (((current - previous) / previous) * 100).toFixed(2);
}

function toOverviewWindow(window: AnalyticsOverviewWindowRange) {
  return {
    label: window.label,
    startDate: window.start.toISOString(),
    endDate: endInclusive(window.end).toISOString(),
  };
}

export function buildAnalyticsOverviewSnapshot(input: {
  currentTransactions: LedgerTransactionListItem[];
  previousTransactions?: LedgerTransactionListItem[];
  currency: string;
  currentWindow: AnalyticsOverviewWindowRange;
  previousWindow?: AnalyticsOverviewWindowRange;
}): AnalyticsOverviewSnapshotResult {
  const currentTotals = buildAnalyticsCashFlowSummary(input.currentTransactions, input.currency);
  const previousTotals = input.previousTransactions && input.previousWindow
    ? buildAnalyticsCashFlowSummary(input.previousTransactions, input.currency)
    : undefined;

  return {
    currentWindow: {
      label: input.currentWindow.label,
      startDate: input.currentWindow.start.toISOString(),
      endDate: endInclusive(input.currentWindow.end).toISOString(),
    },
    previousWindow: input.previousWindow ? {
      label: input.previousWindow.label,
      startDate: input.previousWindow.start.toISOString(),
      endDate: endInclusive(input.previousWindow.end).toISOString(),
    } : undefined,
    currentTotals,
    previousTotals,
    netFlowChangePercent: previousTotals
      ? percentChange(currentTotals.netFlowAmount, previousTotals.netFlowAmount)
      : undefined,
    biggestExpense: toOverviewHighlight(selectBiggestMovement(input.currentTransactions, input.currency, 'expense')),
    biggestIncome: toOverviewHighlight(selectBiggestMovement(input.currentTransactions, input.currency, 'income')),
  };
}

export function buildAnalyticsOverviewInsights(input: {
  topTagsFact: {
    transactions: LedgerTransactionListItem[];
    taxonomyAssignments?: OrchestrationTransactionTaxonomyItem[];
    tags?: TaxonomyTagItem[];
  };
  sharingInsights: AnalyticsOverviewInsightItem[];
  recurringInsight: AnalyticsOverviewInsightItem;
  transferTransactions: LedgerTransactionListItem[];
  currency: string;
}): AnalyticsOverviewInsightsResult {
  return buildOverviewInsightsResult(input);
}

function categoryName(categoriesById: ReadonlyMap<string, TaxonomyCategoryItem>, categoryId?: string): string {
  return categoryId ? categoriesById.get(categoryId)?.name ?? UNCATEGORIZED : UNCATEGORIZED;
}

function spendingCategoryBreakdown(input: {
  transactions: LedgerTransactionListItem[];
  categories: TaxonomyCategoryItem[];
  currency: string;
  window: { start: Date; end: Date };
}): AnalyticsSpendingOverviewResult['categories'] {
  const expenseCategories = new Map(
    input.categories
      .filter((category) => category.appliesTo === 'expense')
      .map((category) => [category.id, category]),
  );
  const amountByCategory = new Map<string, { categoryId?: string; categoryName: string; amount: string }>();

  for (const transaction of input.transactions) {
    if (!isAnalyticsCashFlowTransaction(transaction, input.currency) || transaction.type !== 'expense') {
      continue;
    }
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < input.window.start || occurredAt >= input.window.end) {
      continue;
    }
    const breakdown = transaction.items.length > 0
      ? transaction.items.map((item) => ({
          categoryId: item.categoryId ?? transaction.categoryId,
          amount: item.amount,
        }))
      : [{ categoryId: transaction.categoryId, amount: transaction.amount }];

    for (const item of breakdown) {
      const key = item.categoryId ?? UNCATEGORIZED;
      const current = amountByCategory.get(key) ?? {
        categoryId: item.categoryId,
        categoryName: categoryName(expenseCategories, item.categoryId),
        amount: '0.00',
      };
      amountByCategory.set(key, {
        ...current,
        amount: addAmount(current.amount, item.amount),
      });
    }
  }

  const totalExpenseAmount = [...amountByCategory.values()]
    .reduce((total, item) => addAmount(total, item.amount), '0.00');
  const total = Number(totalExpenseAmount);

  return [...amountByCategory.values()]
    .sort((left, right) => Number(right.amount) - Number(left.amount))
    .map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((Number(item.amount) / total) * 100) : 0,
    }));
}

export function buildSpendingDashboard(input: {
  currentTransactions: LedgerTransactionListItem[];
  previousTransactions?: LedgerTransactionListItem[];
  categories: TaxonomyCategoryItem[];
  currency: string;
  currentWindow: AnalyticsOverviewWindowRange;
  previousWindow?: AnalyticsOverviewWindowRange;
}): AnalyticsSpendingDashboardResult {
  const currentTotals = buildAnalyticsCashFlowSummary(input.currentTransactions, input.currency);
  const previousTotals = input.previousTransactions && input.previousWindow
    ? buildAnalyticsCashFlowSummary(input.previousTransactions, input.currency)
    : undefined;
  const categories = spendingCategoryBreakdown({
    transactions: input.currentTransactions,
    categories: input.categories,
    currency: selectedCurrency(input.currency),
    window: input.currentWindow,
  });

  return {
    currentWindow: toOverviewWindow(input.currentWindow),
    previousWindow: input.previousWindow ? toOverviewWindow(input.previousWindow) : undefined,
    totalExpenseAmount: currentTotals.expenseAmount,
    previousExpenseChangePercent: previousTotals
      ? percentChange(currentTotals.expenseAmount, previousTotals.expenseAmount)
      : undefined,
    categories,
  };
}

type SpendingTimelineGrouping = 'day' | 'week' | 'month' | 'year';

function spendingTimelineGrouping(period: AnalyticsPeriodPreset): SpendingTimelineGrouping {
  if (period === '7D' || period === '30D') {
    return 'day';
  }
  if (period === '90D') {
    return 'week';
  }
  if (period === 'ALL') {
    return 'year';
  }
  return 'month';
}

function flowProjectionGrouping(period: AnalyticsPeriodPreset): SpendingTimelineGrouping {
  return spendingTimelineGrouping(period);
}

function spendingTimelinePointLabel(
  start: Date,
  grouping: SpendingTimelineGrouping,
  currentWindow: AnalyticsOverviewWindowRange,
): string {
  if (grouping === 'month') {
    return start.getUTCFullYear() === currentWindow.start.getUTCFullYear()
      ? monthLabel(start)
      : `${monthLabel(start)} ${start.getUTCFullYear()}`;
  }
  if (grouping === 'year') {
    return String(start.getUTCFullYear());
  }
  return monthDayLabel(start);
}

function spendingTimelinePoints(
  currentWindow: AnalyticsOverviewWindowRange,
  grouping: SpendingTimelineGrouping,
): AnalyticsSpendingTimelinePoint[] {
  const points: AnalyticsSpendingTimelinePoint[] = [];
  let cursor = new Date(currentWindow.start);

  while (cursor < currentWindow.end) {
    points.push({
      periodKey: cursor.toISOString(),
      label: spendingTimelinePointLabel(cursor, grouping, currentWindow),
      amount: '0.00',
    });
    cursor = grouping === 'day'
      ? addUtcDays(cursor, 1)
      : grouping === 'week'
        ? addUtcDays(cursor, 7)
        : grouping === 'month'
          ? addUtcMonths(cursor, 1)
          : addUtcYears(cursor, 1);
  }

  return points;
}

export function buildSpendingTimeline(input: {
  transactions: LedgerTransactionListItem[];
  currency: string;
  currentWindow: AnalyticsNavigableWindowRange;
  period: AnalyticsPeriodPreset;
}): AnalyticsSpendingTimelineResult {
  const currency = selectedCurrency(input.currency);
  const grouping = spendingTimelineGrouping(input.period);
  const points = spendingTimelinePoints(input.currentWindow, grouping);

  for (const transaction of input.transactions) {
    if (!isAnalyticsCashFlowTransaction(transaction, currency) || transaction.type !== 'expense') {
      continue;
    }
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < input.currentWindow.start || occurredAt >= input.currentWindow.end) {
      continue;
    }
    const candidateIndex = points.findIndex((point, index) => {
      const bucketStart = new Date(point.periodKey);
      const nextBucketStart = index + 1 < points.length
        ? new Date(points[index + 1].periodKey)
        : input.currentWindow.end;
      return occurredAt >= bucketStart && occurredAt < nextBucketStart;
    });
    if (candidateIndex < 0) {
      continue;
    }
    points[candidateIndex] = {
      ...points[candidateIndex],
      amount: addAmount(points[candidateIndex].amount, transaction.amount),
    };
  }

  return {
    currentWindow: toOverviewWindow(input.currentWindow),
    window: {
      label: input.currentWindow.label,
      periodOffset: input.currentWindow.periodOffset,
      canGoPrevious: input.currentWindow.canGoPrevious,
      canGoNext: input.currentWindow.canGoNext,
    },
    points,
  };
}

export function buildSpendingTopExpenses(input: {
  transactions: LedgerTransactionListItem[];
  currency: string;
  currentWindow: AnalyticsOverviewWindowRange;
  limit?: number;
}): AnalyticsSpendingTopExpensesResult {
  const currency = selectedCurrency(input.currency);

  return {
    currentWindow: toOverviewWindow(input.currentWindow),
    items: input.transactions
      .filter((transaction) => isAnalyticsCashFlowTransaction(transaction, currency) && transaction.type === 'expense')
      .filter((transaction) => {
        const occurredAt = new Date(transaction.occurredAt);
        return !Number.isNaN(occurredAt.getTime())
          && occurredAt >= input.currentWindow.start
          && occurredAt < input.currentWindow.end;
      })
      .sort(byAmountDescending)
      .slice(0, input.limit ?? 3)
      .map((transaction) => toOverviewHighlight(transaction))
      .filter((transaction): transaction is AnalyticsOverviewHighlight => Boolean(transaction)),
  };
}

export function buildSpendingOverview(
  input: {
    transactions: LedgerTransactionListItem[];
    categories: TaxonomyCategoryItem[];
    currency: string;
    granularity: LedgerCashFlowGranularity;
    periodOffset?: number;
    periodMonths?: number;
    now: Date;
  },
): AnalyticsSpendingOverviewResult {
  const currency = selectedCurrency(input.currency);
  const window = input.periodMonths
    ? buildAnalyticsMonthRangeWindow(input.periodMonths, input.now, input.periodOffset)
    : buildAnalyticsPeriodWindow(input.granularity, input.now, input.periodOffset);
  const categories = spendingCategoryBreakdown({
    transactions: input.transactions,
    categories: input.categories,
    currency,
    window,
  });

  return {
    granularity: input.granularity,
    window: {
      label: window.label,
      periodOffset: window.periodOffset,
      canGoPrevious: window.canGoPrevious,
      canGoNext: window.canGoNext,
    },
    totalExpenseAmount: categories.reduce((total, category) => addAmount(total, category.amount), '0.00'),
    categories,
  };
}

function movementSignedAmount(movement: SchedulingMovementItem): string {
  return movement.type === 'expense'
    ? `-${movement.amount}`
    : movement.type === 'income'
      ? movement.amount
      : '0.00';
}

function movementTitle(movement: SchedulingMovementItem): string {
  return movement.description?.trim()
    || movement.merchant?.trim()
    || (movement.type === 'expense' ? 'Expense' : movement.type === 'income' ? 'Income' : 'Transfer');
}

function scheduledMovementDueAt(movement: SchedulingMovementItem): Date | undefined {
  const candidate = movement.nextDueAt ?? movement.startAt;
  const parsed = candidate ? new Date(candidate) : undefined;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
}

function bucketStartFor(date: Date, grouping: SpendingTimelineGrouping): Date {
  return grouping === 'day'
    ? startOfUtcDay(date)
    : grouping === 'week'
      ? startOfUtcWeek(date)
      : grouping === 'month'
        ? startOfUtcMonth(date)
        : startOfUtcYear(date);
}

function advanceCursor(date: Date, grouping: SpendingTimelineGrouping): Date {
  return grouping === 'day'
    ? addUtcDays(date, 1)
    : grouping === 'week'
      ? addUtcDays(date, 7)
      : grouping === 'month'
        ? addUtcMonths(date, 1)
        : addUtcYears(date, 1);
}

function flowProjectionPoints(input: {
  currentWindow: AnalyticsOverviewWindowRange;
  grouping: SpendingTimelineGrouping;
  postedDeltasByBucket: ReadonlyMap<string, string>;
  scheduledDeltasByBucket: ReadonlyMap<string, string>;
  startBalanceAmount: string;
  now: Date;
}): {
  points: AnalyticsFlowProjectionPoint[];
  lowestPointAmount: string;
  lowestPointLabel: string;
  currentMarkerLabel: string;
} {
  const points: AnalyticsFlowProjectionPoint[] = [];
  let cursor = new Date(input.currentWindow.start);
  let runningBalance = input.startBalanceAmount;
  let lowestPointAmount = input.startBalanceAmount;
  let lowestPointLabel = spendingTimelinePointLabel(cursor, input.grouping, input.currentWindow);
  let currentMarkerLabel = input.currentWindow.label;

  while (cursor < input.currentWindow.end) {
    const label = spendingTimelinePointLabel(cursor, input.grouping, input.currentWindow);
    const bucketKey = cursor.toISOString();
    const postedDelta = input.postedDeltasByBucket.get(bucketKey) ?? '0.00';
    const scheduledDelta = input.scheduledDeltasByBucket.get(bucketKey) ?? '0.00';
    const bucketEnd = advanceCursor(cursor, input.grouping);
    const balanceAfterPosted = addAmount(runningBalance, postedDelta);
    const expectedBalance = addAmount(balanceAfterPosted, scheduledDelta);
    const actualBalanceVisible = bucketEnd <= input.now || (cursor <= input.now && input.now < bucketEnd)
      ? balanceAfterPosted
      : undefined;
    const expectedBalanceVisible = bucketEnd > input.now ? expectedBalance : undefined;

    points.push({
      periodKey: bucketKey,
      label,
      postedBalanceAmount: actualBalanceVisible,
      scheduledBalanceAmount: expectedBalanceVisible,
      expectedBalanceAmount: expectedBalance,
    });

    if (cursor <= input.now && input.now < bucketEnd) {
      currentMarkerLabel = label;
    }
    if (Number(expectedBalance) < Number(lowestPointAmount)) {
      lowestPointAmount = expectedBalance;
      lowestPointLabel = label;
    }

    runningBalance = expectedBalance;
    cursor = bucketEnd;
  }

  return { points, lowestPointAmount, lowestPointLabel, currentMarkerLabel };
}

export function buildFlowProjection(input: {
  currency: string;
  currentWindow: AnalyticsNavigableWindowRange;
  period: AnalyticsPeriodPreset;
  currentBalanceAmount: string;
  postedTransactions: LedgerTransactionListItem[];
  scheduledMovements: SchedulingMovementItem[];
  now: Date;
}): AnalyticsFlowProjectionResult {
  const currency = selectedCurrency(input.currency);
  const grouping = flowProjectionGrouping(input.period);
  const postedDeltasByBucket = new Map<string, string>();
  const scheduledDeltasByBucket = new Map<string, string>();
  let postedDeltaToNow = '0.00';

  for (const transaction of input.postedTransactions) {
    if (!isAnalyticsCashFlowTransaction(transaction, currency) || transaction.type === 'transfer') {
      continue;
    }
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < input.currentWindow.start || occurredAt >= input.currentWindow.end) {
      continue;
    }
    const key = bucketStartFor(occurredAt, grouping).toISOString();
    const current = postedDeltasByBucket.get(key) ?? '0.00';
    const delta = transaction.type === 'income' ? transaction.amount : `-${transaction.amount}`;
    postedDeltasByBucket.set(key, addAmount(current, delta));
    if (occurredAt <= input.now) {
      postedDeltaToNow = addAmount(postedDeltaToNow, delta);
    }
  }

  for (const movement of input.scheduledMovements) {
    if (movement.status !== 'active' || movement.currency.toUpperCase() !== currency) {
      continue;
    }
    if (movement.type !== 'income' && movement.type !== 'expense') {
      continue;
    }
    const dueAt = scheduledMovementDueAt(movement);
    if (!dueAt || dueAt < input.now || dueAt < input.currentWindow.start || dueAt >= input.currentWindow.end) {
      continue;
    }
    const key = bucketStartFor(dueAt, grouping).toISOString();
    const current = scheduledDeltasByBucket.get(key) ?? '0.00';
    scheduledDeltasByBucket.set(key, addAmount(current, movementSignedAmount(movement)));
  }

  const startBalanceAmount = subtractAmount(input.currentBalanceAmount, postedDeltaToNow);
  const { points, lowestPointAmount, lowestPointLabel, currentMarkerLabel } = flowProjectionPoints({
    currentWindow: input.currentWindow,
    grouping,
    postedDeltasByBucket,
    scheduledDeltasByBucket,
    startBalanceAmount,
    now: input.now,
  });

  return {
    currentWindow: {
      label: input.currentWindow.label,
      startDate: input.currentWindow.start.toISOString(),
      endDate: endInclusive(input.currentWindow.end).toISOString(),
    },
    window: {
      label: input.currentWindow.label,
      periodOffset: input.currentWindow.periodOffset,
      canGoPrevious: input.currentWindow.canGoPrevious,
      canGoNext: input.currentWindow.canGoNext,
    },
    currentBalanceAmount: input.currentBalanceAmount,
    expectedEndBalanceAmount: points.at(-1)?.expectedBalanceAmount ?? input.currentBalanceAmount,
    lowestPointAmount,
    lowestPointLabel,
    currentMarkerLabel,
    points,
  };
}

export function buildFlowUpcoming(input: {
  scheduledMovements: SchedulingMovementItem[];
  currency: string;
  currentWindow: AnalyticsOverviewWindowRange;
}): AnalyticsFlowUpcomingResult {
  const currency = selectedCurrency(input.currency);
  const incoming: AnalyticsFlowUpcomingItem[] = [];
  const outgoing: AnalyticsFlowUpcomingItem[] = [];

  for (const movement of input.scheduledMovements) {
    if (movement.status !== 'active' || movement.currency.toUpperCase() !== currency) {
      continue;
    }
    if (movement.type !== 'income' && movement.type !== 'expense') {
      continue;
    }
    const dueAt = scheduledMovementDueAt(movement);
    if (!dueAt || dueAt < input.currentWindow.start || dueAt >= input.currentWindow.end) {
      continue;
    }
    const item = {
      movementId: movement.id,
      title: movementTitle(movement),
      amount: movement.amount,
      occurredAt: dueAt.toISOString(),
    };
    if (movement.type === 'income') {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  const byDueDate = (left: AnalyticsFlowUpcomingItem, right: AnalyticsFlowUpcomingItem) => left.occurredAt.localeCompare(right.occurredAt);
  return {
    incomeItems: incoming.sort(byDueDate),
    expenseItems: outgoing.sort(byDueDate),
  };
}

function flowPeriodTitle(grouping: SpendingTimelineGrouping): string {
  return grouping === 'day' ? 'day' : 'period';
}

export function buildFlowInsights(input: {
  postedTransactions: LedgerTransactionListItem[];
  currency: string;
  currentWindow: AnalyticsOverviewWindowRange;
  period: AnalyticsPeriodPreset;
}): AnalyticsFlowInsightsResult {
  const currency = selectedCurrency(input.currency);
  const grouping = flowProjectionGrouping(input.period);
  const buckets = spendingTimelinePoints(input.currentWindow, grouping);
  const netByBucket = new Map<string, string>();

  for (const transaction of input.postedTransactions) {
    if (!isAnalyticsCashFlowTransaction(transaction, currency) || transaction.type === 'transfer') {
      continue;
    }
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < input.currentWindow.start || occurredAt >= input.currentWindow.end) {
      continue;
    }
    const key = bucketStartFor(occurredAt, grouping).toISOString();
    const current = netByBucket.get(key) ?? '0.00';
    const delta = transaction.type === 'income' ? transaction.amount : `-${transaction.amount}`;
    netByBucket.set(key, addAmount(current, delta));
  }

  const bucketAmounts = buckets.map((bucket) => ({
    label: bucket.label,
    amount: Number(netByBucket.get(bucket.periodKey) ?? '0.00'),
  }));
  const best = [...bucketAmounts].sort((left, right) => right.amount - left.amount)[0];
  const worst = [...bucketAmounts].sort((left, right) => left.amount - right.amount)[0];
  const total = bucketAmounts.reduce((current, bucket) => current + bucket.amount, 0);
  const positiveCount = bucketAmounts.filter((bucket) => bucket.amount > 0).length;
  const average = bucketAmounts.length > 0 ? total / bucketAmounts.length : 0;

  return {
    items: [
      {
        key: 'bestPeriod',
        title: `Best ${flowPeriodTitle(grouping)}`,
        subtitle: best?.label ?? 'No data',
        amount: best ? best.amount.toFixed(2) : '0.00',
        tone: 'income',
      },
      {
        key: 'worstPeriod',
        title: `Worst ${flowPeriodTitle(grouping)}`,
        subtitle: worst?.label ?? 'No data',
        amount: worst ? worst.amount.toFixed(2) : '0.00',
        tone: 'expense',
      },
      {
        key: 'averagePeriod',
        title: `Average ${flowPeriodTitle(grouping)}`,
        subtitle: `Across ${bucketAmounts.length} ${flowPeriodTitle(grouping)}${bucketAmounts.length === 1 ? '' : 's'}`,
        amount: average.toFixed(2),
        tone: 'neutral',
      },
      {
        key: 'positivePeriods',
        title: `Positive ${flowPeriodTitle(grouping)}s`,
        subtitle: `${positiveCount} of ${bucketAmounts.length}`,
        amount: String(positiveCount),
        tone: 'neutral',
      },
    ],
  };
}
