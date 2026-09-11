import type { LedgerNetWorthTrendPoint, LedgerTransactionListItem } from './ledger.port';
import { addDecimalAmounts } from './decimalAmount';
import { balanceImpact } from './movementSemantics';

type BuildAccountBalanceTrendInput = {
  transactions: LedgerTransactionListItem[];
  now: Date;
};

type TrendPeriod = {
  periodKey: string;
  label: string;
  end: Date;
};

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

function buildTrendPeriods(firstMonth: Date, now: Date): TrendPeriod[] {
  const currentMonth = startOfUtcMonth(now);
  const monthCount = (currentMonth.getUTCFullYear() - firstMonth.getUTCFullYear()) * 12
    + currentMonth.getUTCMonth() - firstMonth.getUTCMonth() + 1;
  if (monthCount < 1) {
    return [];
  }
  return Array.from({ length: monthCount }, (_, index) => {
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
  return balanceImpact(transaction.type, transaction.amount);
}

export function buildAccountBalanceTrend(input: BuildAccountBalanceTrendInput): LedgerNetWorthTrendPoint[] | undefined {
  const firstPostedTransactionMonth = input.transactions
    .filter((transaction) => transaction.status === 'posted')
    .map((transaction) => new Date(transaction.occurredAt))
    .filter((occurredAt) => !Number.isNaN(occurredAt.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())
    .at(0);
  if (!firstPostedTransactionMonth) {
    return undefined;
  }

  const periods = buildTrendPeriods(startOfUtcMonth(firstPostedTransactionMonth), input.now);
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
