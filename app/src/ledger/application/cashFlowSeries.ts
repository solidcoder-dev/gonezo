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
  now: Date;
};

type PeriodBucket = {
  periodKey: string;
  label: string;
  start: Date;
  end: Date;
};

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

function buildPeriods(granularity: LedgerCashFlowGranularity, now: Date): PeriodBucket[] {
  if (granularity === 'daily') {
    const end = addUtcDays(startOfUtcDay(now), 1);
    const first = addUtcDays(end, -7);
    return Array.from({ length: 7 }, (_, index) => {
      const start = addUtcDays(first, index);
      return { periodKey: periodKey(start, granularity), label: dayLabel(start), start, end: addUtcDays(start, 1) };
    });
  }
  if (granularity === 'weekly') {
    const current = startOfUtcWeek(now);
    const first = addUtcDays(current, -7 * 7);
    return Array.from({ length: 8 }, (_, index) => {
      const start = addUtcDays(first, index * 7);
      return { periodKey: periodKey(start, granularity), label: weekLabel(start), start, end: addUtcDays(start, 7) };
    });
  }
  if (granularity === 'monthly') {
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const first = addUtcMonths(current, -5);
    return Array.from({ length: 6 }, (_, index) => {
      const start = addUtcMonths(first, index);
      return { periodKey: periodKey(start, granularity), label: monthLabel(start), start, end: addUtcMonths(start, 1) };
    });
  }
  const current = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const first = addUtcYears(current, -4);
  return Array.from({ length: 5 }, (_, index) => {
    const start = addUtcYears(first, index);
    return { periodKey: periodKey(start, granularity), label: String(start.getUTCFullYear()), start, end: addUtcYears(start, 1) };
  });
}

function findPeriod(periods: PeriodBucket[], occurredAt: string): PeriodBucket | undefined {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return periods.find((period) => parsed >= period.start && parsed < period.end);
}

export function buildCashFlowSeries(input: BuildCashFlowSeriesInput): LedgerGetCashFlowSeriesResult {
  const activeAccounts = input.accounts.filter((account) => account.status === 'active');
  const currencies = [...new Set(activeAccounts.map((account) => account.currency.toUpperCase()))].sort();
  const requestedCurrency = input.currency?.trim().toUpperCase();
  const selectedCurrency = requestedCurrency && currencies.includes(requestedCurrency)
    ? requestedCurrency
    : currencies[0] ?? '';
  const activeAccountIds = new Set(
    activeAccounts
      .filter((account) => account.currency.toUpperCase() === selectedCurrency)
      .map((account) => account.id),
  );
  const periods = buildPeriods(input.granularity, input.now);
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
    if (
      transaction.status !== 'posted'
      || (transaction.type !== 'income' && transaction.type !== 'expense')
      || transaction.currency.toUpperCase() !== selectedCurrency
      || !activeAccountIds.has(transaction.accountId)
    ) {
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
    points,
  };
}
