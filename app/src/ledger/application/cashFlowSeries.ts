import type {
  LedgerAccountItem,
  LedgerCashFlowGranularity,
  LedgerGetCashFlowSeriesResult,
  LedgerTransactionListItem,
} from './ledger.port';

type BuildCashFlowSeriesInput = {
  accounts: LedgerAccountItem[];
  transactions: LedgerTransactionListItem[];
  currency?: string;
  granularity: LedgerCashFlowGranularity;
  periodOffset?: number;
  periodCount?: number;
  now: Date;
};

type PeriodBucket = {
  periodKey: string;
  label: string;
  start: Date;
  end: Date;
};

const OPENING_BALANCE_DESCRIPTION = 'opening balance';

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
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

function weekLabel(date: Date): string {
  const month = monthLabel(date);
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'UTC' }).format(date);
  return `${month} ${day}`;
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

function periodKey(date: Date, granularity: LedgerCashFlowGranularity): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  if (granularity === 'daily') {
    return `${year}-${month}-${day}`;
  }
  if (granularity === 'weekly') {
    return `${year}-W${month}-${day}`;
  }
  if (granularity === 'monthly') {
    return `${year}-${month}`;
  }
  return String(year);
}

function buildPeriods(
  granularity: LedgerCashFlowGranularity,
  now: Date,
  periodOffset: number,
  inputPeriodCount?: number,
): { periods: PeriodBucket[]; label: string } {
  const periodCount = Number.isFinite(inputPeriodCount) && inputPeriodCount != null && inputPeriodCount > 0
    ? Math.min(Math.trunc(inputPeriodCount), 24)
    : undefined;
  if (granularity === 'daily') {
    const count = periodCount ?? 7;
    const end = addUtcDays(startOfUtcDay(now), 1 + periodOffset * count);
    const first = addUtcDays(end, -count);
    const periods = Array.from({ length: count }, (_, index) => {
      const start = addUtcDays(first, index);
      return { periodKey: periodKey(start, granularity), label: dayLabel(start), start, end: addUtcDays(start, 1) };
    });
    return { periods, label: rangeLabel(first, end, granularity) };
  }
  if (granularity === 'weekly') {
    const count = periodCount ?? 8;
    const current = addUtcDays(startOfUtcWeek(now), periodOffset * count * 7);
    const first = addUtcDays(current, -(count - 1) * 7);
    const end = addUtcDays(first, count * 7);
    const periods = Array.from({ length: count }, (_, index) => {
      const start = addUtcDays(first, index * 7);
      return { periodKey: periodKey(start, granularity), label: weekLabel(start), start, end: addUtcDays(start, 7) };
    });
    return { periods, label: rangeLabel(first, end, granularity) };
  }
  if (granularity === 'monthly') {
    const count = periodCount ?? 6;
    const current = addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), periodOffset * count);
    const first = addUtcMonths(current, -(count - 1));
    const end = addUtcMonths(first, count);
    const periods = Array.from({ length: count }, (_, index) => {
      const start = addUtcMonths(first, index);
      return { periodKey: periodKey(start, granularity), label: monthLabel(start), start, end: addUtcMonths(start, 1) };
    });
    return { periods, label: rangeLabel(first, end, granularity) };
  }
  const count = periodCount ?? 5;
  const current = addUtcYears(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), periodOffset * count);
  const first = addUtcYears(current, -(count - 1));
  const end = addUtcYears(first, count);
  const periods = Array.from({ length: count }, (_, index) => {
    const start = addUtcYears(first, index);
    return { periodKey: periodKey(start, granularity), label: String(start.getUTCFullYear()), start, end: addUtcYears(start, 1) };
  });
  return { periods, label: rangeLabel(first, end, granularity) };
}

function findPeriod(periods: PeriodBucket[], occurredAt: string): PeriodBucket | undefined {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return periods.find((period) => parsed >= period.start && parsed < period.end);
}

function isAutomaticOpeningBalance(transaction: LedgerTransactionListItem): boolean {
  return transaction.description?.trim().toLowerCase() === OPENING_BALANCE_DESCRIPTION
    && !transaction.merchant
    && !transaction.categoryId
    && transaction.items.length === 0;
}

function isCashFlowTransaction(
  transaction: LedgerTransactionListItem,
  selectedCurrency: string,
  accountIds: Set<string>,
): boolean {
  return transaction.status === 'posted'
    && (transaction.type === 'income' || transaction.type === 'expense')
    && transaction.currency.toUpperCase() === selectedCurrency
    && accountIds.has(transaction.accountId)
    && !isAutomaticOpeningBalance(transaction);
}

export function buildCashFlowSeries(input: BuildCashFlowSeriesInput): LedgerGetCashFlowSeriesResult {
  const ledgerAccounts = input.accounts;
  const currencies = [...new Set(ledgerAccounts.map((account) => account.currency.toUpperCase()))].sort();
  const requestedCurrency = input.currency?.trim().toUpperCase();
  const selectedCurrency = requestedCurrency && currencies.includes(requestedCurrency)
    ? requestedCurrency
    : currencies[0] ?? '';
  const accountIds = new Set(
    ledgerAccounts
      .filter((account) => account.currency.toUpperCase() === selectedCurrency)
      .map((account) => account.id),
  );
  const periodOffset = Math.min(0, Math.trunc(input.periodOffset ?? 0));
  const { periods, label } = buildPeriods(input.granularity, input.now, periodOffset, input.periodCount);
  const pointByPeriod = new Map(periods.map((period) => [
    period.periodKey,
    {
      periodKey: period.periodKey,
      label: period.label,
      incomeAmount: '0.00',
      expenseAmount: '0.00',
    },
  ]));

  for (const transaction of input.transactions) {
    if (!isCashFlowTransaction(transaction, selectedCurrency, accountIds)) {
      continue;
    }
    const period = findPeriod(periods, transaction.occurredAt);
    if (!period) {
      continue;
    }
    const point = pointByPeriod.get(period.periodKey);
    if (!point) {
      continue;
    }
    if (transaction.type === 'income') {
      point.incomeAmount = addAmount(point.incomeAmount, transaction.amount);
    } else {
      point.expenseAmount = addAmount(point.expenseAmount, transaction.amount);
    }
  }

  const points = periods.map((period) => pointByPeriod.get(period.periodKey)!);
  return {
    currencies,
    selectedCurrency,
    granularity: input.granularity,
    totals: points.reduce(
      (totals, point) => ({
        incomeAmount: addAmount(totals.incomeAmount, point.incomeAmount),
        expenseAmount: addAmount(totals.expenseAmount, point.expenseAmount),
      }),
      { incomeAmount: '0.00', expenseAmount: '0.00' },
    ),
    window: {
      label,
      periodOffset,
      canGoNext: periodOffset < 0,
    },
    points,
  };
}
