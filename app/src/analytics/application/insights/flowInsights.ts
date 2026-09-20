import { balanceImpact } from '../../../ledger/application/movementSemantics';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsFlowFact, AnalyticsFlowInsight, AnalyticsFlowProjectionPoint, AnalyticsFlowReport, AnalyticsMoneyDto } from '../analyticsFlowReport';

function decimal(value: string): ExactDecimal {
  return ExactDecimal.from(value);
}

function money(value: string, currency: string): AnalyticsMoneyDto {
  return { value: decimal(value).toFixed(2), currency };
}

function day(value: string): string {
  return value.slice(0, 10);
}

function addDays(value: string): string {
  const result = new Date(`${value}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + 1);
  return result.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

export function buildFlowInsights(
  facts: AnalyticsFlowFact[],
  projection: AnalyticsFlowProjectionPoint[],
  window: AnalyticsFlowReport['window'],
  currency: string,
): AnalyticsFlowInsight[] {
  const buckets: Array<{ date: string; net: string }> = [];
  for (let cursor = window.start; cursor < window.endExclusive; cursor = addDays(cursor)) buckets.push({ date: cursor, net: '0' });
  for (const fact of facts) {
    const bucket = buckets.find((item) => item.date === day(fact.effectiveAt));
    if (bucket) bucket.net = decimal(bucket.net).add(decimal(balanceImpact(fact.type, fact.amount.value))).toString();
  }
  const zeroBucket = { date: window.start, net: '0' };
  const best = buckets.reduce((current, candidate) => decimal(candidate.net).compare(decimal(current.net)) > 0 ? candidate : current, buckets[0] ?? zeroBucket);
  const worst = buckets.reduce((current, candidate) => decimal(candidate.net).compare(decimal(current.net)) < 0 ? candidate : current, buckets[0] ?? zeroBucket);
  const inflow = facts
    .filter((fact) => decimal(balanceImpact(fact.type, fact.amount.value)).compare(decimal('0')) > 0)
    .sort((left, right) => decimal(balanceImpact(right.type, right.amount.value)).compare(decimal(balanceImpact(left.type, left.amount.value)))
      || left.effectiveAt.localeCompare(right.effectiveAt)
      || left.id.localeCompare(right.id))[0];
  const zeroPoint = { occurredAt: window.start, balance: money('0', currency), phase: 'posted' as const };
  const highest = projection.reduce((current, candidate) => decimal(candidate.balance.value).compare(decimal(current.balance.value)) > 0 ? candidate : current, projection[0] ?? zeroPoint);
  const lowest = projection.reduce((current, candidate) => decimal(candidate.balance.value).compare(decimal(current.balance.value)) < 0 ? candidate : current, projection[0] ?? zeroPoint);
  const total = buckets.reduce((sum, bucket) => decimal(sum).add(decimal(bucket.net)).toString(), '0');
  return [
    { key: 'bestPeriod', amount: money(best.net, currency), occurredAt: best.date },
    { key: 'worstPeriod', amount: money(worst.net, currency), occurredAt: worst.date },
    { key: 'averageDailyFlow', amount: money(decimal(total).ratioToTruncated(decimal(String(daysBetween(window.start, window.endExclusive))), 2).toString(), currency) },
    { key: 'highestBalance', amount: highest.balance, occurredAt: highest.occurredAt },
    { key: 'lowestBalance', amount: lowest.balance, occurredAt: lowest.occurredAt },
    { key: 'largestInflow', amount: inflow ? money(balanceImpact(inflow.type, inflow.amount.value), currency) : money('0', currency), occurredAt: inflow?.effectiveAt },
  ];
}
