import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import type { LedgerAccountItem, LedgerCashFlowGranularity, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type {
  AnalyticsCashFlowSummaryResult,
  AnalyticsPeriodWindow,
  AnalyticsSpendingOverviewResult,
} from './analytics.port';

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
    now: Date;
  },
): AnalyticsSpendingOverviewResult {
  const currency = selectedCurrency(input.currency);
  const window = buildAnalyticsPeriodWindow(input.granularity, input.now, input.periodOffset);
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
