import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow, AnalyticsSpendingTimelineBucket } from '../spendingReport';
import { expensesInWindow, spendingMoney } from '../spendingWindowFacts';

function day(value: string, count: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function month(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())).toISOString().slice(0, 10);
}

function year(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

export function buildSpendingTimeline(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
): AnalyticsSpendingTimelineBucket[] {
  const dayCount = Math.round((Date.parse(`${window.endExclusive}T00:00:00.000Z`) - Date.parse(`${window.start}T00:00:00.000Z`)) / 86_400_000);
  const unit = dayCount <= 14 ? 'day' : dayCount <= 93 ? 'week' : dayCount <= 730 ? 'month' : 'year';
  const buckets: AnalyticsSpendingTimelineBucket[] = [];
  for (let start = window.start; start < window.endExclusive;) {
    const next = unit === 'day' ? day(start, 1) : unit === 'week' ? day(start, 7) : unit === 'month' ? month(start) : year(start);
    buckets.push({ start, endExclusive: next < window.endExclusive ? next : window.endExclusive, amount: spendingMoney(ExactDecimal.from('0'), currency), sequence: buckets.length });
    start = next;
  }
  for (const movement of expensesInWindow(movements, window, currency)) {
    const occurredAt = movement.occurredAt.slice(0, 10);
    const bucket = buckets.find((item) => occurredAt >= item.start && occurredAt < item.endExclusive);
    if (bucket) bucket.amount = spendingMoney(ExactDecimal.from(bucket.amount.value).add(ExactDecimal.from(movement.amount)), currency);
  }
  return buckets;
}
