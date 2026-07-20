import type { LedgerNetWorthTrendPoint, LedgerTransactionListItem } from './ledger.port';
import { addDecimalAmounts } from './decimalAmount';

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

export function ledgerTransactionBalanceDelta(transaction: LedgerTransactionListItem): string {
  if (transaction.status !== 'posted') {
    return '0.00';
  }
  if (transaction.type === 'income' || transaction.type === 'transfer_in') {
    return transaction.amount;
  }
  if (transaction.type === 'expense' || transaction.type === 'transfer_out') {
    return addDecimalAmounts('0', `-${transaction.amount}`);
  }
  return '0.00';
}

export function buildAccountBalanceTrend(input: BuildAccountBalanceTrendInput): LedgerNetWorthTrendPoint[] | undefined {
  const periods = buildTrendPeriods(input.now);
  const trend = periods.map((period) => {
    const balanceAmount = input.transactions
      .filter((transaction) => {
        const occurredAt = new Date(transaction.occurredAt);
        return !Number.isNaN(occurredAt.getTime()) && occurredAt < period.end;
      })
      .reduce((total, transaction) => addDecimalAmounts(total, ledgerTransactionBalanceDelta(transaction)), '0.00');

    return {
      period: period.periodKey,
      periodKey: period.periodKey,
      label: period.label,
      balanceAmount,
    };
  });

  return trend;
}
