import type { LedgerNetWorthTrendPoint, LedgerTransactionListItem } from './ledger.port';

type BuildAccountBalanceTrendInput = {
  transactions: LedgerTransactionListItem[];
  now: Date;
};

type TrendPeriod = {
  periodKey: string;
  label: string;
  end: Date;
};

const TREND_PERIODS = 6;

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
}

function periodKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function buildTrendPeriods(now: Date): TrendPeriod[] {
  const currentMonth = startOfUtcMonth(now);
  const firstMonth = addUtcMonths(currentMonth, 1 - TREND_PERIODS);
  return Array.from({ length: TREND_PERIODS }, (_, index) => {
    const start = addUtcMonths(firstMonth, index);
    return {
      periodKey: periodKey(start),
      label: monthLabel(start),
      end: addUtcMonths(start, 1),
    };
  });
}

export function ledgerTransactionBalanceDelta(transaction: LedgerTransactionListItem): number {
  if (transaction.status !== 'posted') {
    return 0;
  }
  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (transaction.type === 'income' || transaction.type === 'transfer_in') {
    return amount;
  }
  if (transaction.type === 'expense' || transaction.type === 'transfer_out') {
    return -amount;
  }
  return 0;
}

export function buildAccountBalanceTrend(input: BuildAccountBalanceTrendInput): LedgerNetWorthTrendPoint[] | undefined {
  const periods = buildTrendPeriods(input.now);
  const trend = periods.map((period) => {
    const balanceAmount = input.transactions
      .filter((transaction) => {
        const occurredAt = new Date(transaction.occurredAt);
        return !Number.isNaN(occurredAt.getTime()) && occurredAt < period.end;
      })
      .reduce((total, transaction) => addAmount(total, ledgerTransactionBalanceDelta(transaction).toFixed(2)), '0.00');

    return {
      periodKey: period.periodKey,
      label: period.label,
      balanceAmount,
    };
  });

  return trend.some((point) => Number(point.balanceAmount) !== 0) ? trend : undefined;
}
