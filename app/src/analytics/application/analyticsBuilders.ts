import type {
  OrchestrationTransactionTaxonomyItem,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
} from '../../taxonomy/application/taxonomy.port';
import type { LedgerAccountItem, LedgerCashFlowGranularity, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type {
  AnalyticsCashFlowSummaryResult,
  AnalyticsOverviewHighlight,
  AnalyticsOverviewInsightItem,
  AnalyticsOverviewInsightsResult,
  AnalyticsOverviewSnapshotResult,
  AnalyticsPeriodWindow,
  AnalyticsSpendingOverviewResult,
} from './analytics.port';
import type { AnalyticsPeriodPreset } from './analyticsFilters';
import { buildOverviewInsightsResult } from './overviewInsights';

const UNCATEGORIZED = 'Uncategorized';
const OPENING_BALANCE_DESCRIPTION = 'opening balance';

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
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
    return { start, end, label: dayLabel(start), periodOffset, canGoNext: periodOffset < 0 };
  }
  if (granularity === 'weekly') {
    const start = addUtcDays(startOfUtcWeek(now), periodOffset * 7);
    const end = addUtcDays(start, 7);
    return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoNext: periodOffset < 0 };
  }
  if (granularity === 'monthly') {
    const start = addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), periodOffset);
    const end = addUtcMonths(start, 1);
    return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoNext: periodOffset < 0 };
  }
  const start = addUtcYears(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), periodOffset);
  const end = addUtcYears(start, 1);
  return { start, end, label: rangeLabel(start, end, granularity), periodOffset, canGoNext: periodOffset < 0 };
}

export type AnalyticsOverviewWindowRange = {
  label: string;
  start: Date;
  end: Date;
};

export function buildAnalyticsOverviewWindows(
  period: AnalyticsPeriodPreset,
  now: Date,
  earliestOccurredAt?: Date,
): { currentWindow: AnalyticsOverviewWindowRange; previousWindow?: AnalyticsOverviewWindowRange } {
  if (period === '1W') {
    const currentStart = addUtcDays(startOfUtcDay(now), -6);
    const currentEnd = addUtcDays(startOfUtcDay(now), 1);
    const previousStart = addUtcDays(currentStart, -7);
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

  const monthCount = period === '1M'
    ? 1
    : period === '3M'
      ? 3
      : period === '6M'
        ? 6
        : period === '1Y'
          ? 12
          : 60;
  const currentEnd = addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), 1);
  const currentStart = addUtcMonths(currentEnd, -monthCount);
  const previousEnd = currentStart;
  const previousStart = addUtcMonths(previousEnd, -monthCount);
  return {
    currentWindow: { start: currentStart, end: currentEnd, label: overviewRangeLabel(currentStart, currentEnd) },
    previousWindow: { start: previousStart, end: previousEnd, label: overviewRangeLabel(previousStart, previousEnd) },
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
  const expenseCategories = new Map(
    input.categories
      .filter((category) => category.appliesTo === 'expense')
      .map((category) => [category.id, category]),
  );
  const amountByCategory = new Map<string, { categoryId?: string; categoryName: string; amount: string }>();

  for (const transaction of input.transactions) {
    if (!isAnalyticsCashFlowTransaction(transaction, currency) || transaction.type !== 'expense') {
      continue;
    }
    const occurredAt = new Date(transaction.occurredAt);
    if (Number.isNaN(occurredAt.getTime()) || occurredAt < window.start || occurredAt >= window.end) {
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

  return {
    granularity: input.granularity,
    window: {
      label: window.label,
      periodOffset: window.periodOffset,
      canGoNext: window.canGoNext,
    },
    totalExpenseAmount,
    categories: [...amountByCategory.values()]
      .sort((left, right) => Number(right.amount) - Number(left.amount))
      .map((item) => ({
        ...item,
        percentage: total > 0 ? Math.round((Number(item.amount) / total) * 100) : 0,
      })),
  };
}
