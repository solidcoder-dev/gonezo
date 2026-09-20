import type { AnalyticsPeriod } from './analyticsFilters';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';
import { balanceImpact, isBalanceInflow, isBalanceOutflow } from '../../ledger/application/movementSemantics';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type AnalyticsMoneyDto = { value: string; currency: string };
export type AnalyticsFlowFact = {
  id: string;
  source: 'posted' | 'expected' | 'scheduledProjection';
  effectiveAt: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: AnalyticsMoneyDto;
};
export type AnalyticsFlowProjectionPoint = { occurredAt: string; balance: AnalyticsMoneyDto; phase: 'posted' | 'projected' };
export type AnalyticsFlowInsightKey = 'bestPeriod' | 'worstPeriod' | 'averageDailyFlow' | 'highestBalance' | 'lowestBalance' | 'largestInflow';
export type AnalyticsFlowInsight = { key: AnalyticsFlowInsightKey; amount: AnalyticsMoneyDto; occurredAt?: string; supportingValue?: string };
export type AnalyticsFlowReport = {
  window: { start: string; endExclusive: string; selection: AnalyticsPeriodSelection; canGoPrevious: boolean; canGoNext: boolean };
  windowRelation: 'current' | 'past';
  projectionMode: 'accountBalance' | 'filteredImpact';
  currency: string;
  summary: { openingBalance: AnalyticsMoneyDto; currentBalance?: AnalyticsMoneyDto; endBalance: AnalyticsMoneyDto; netFlow: AnalyticsMoneyDto; lowestBalance: { amount: AnalyticsMoneyDto; occurredAt: string }; highestBalance: { amount: AnalyticsMoneyDto; occurredAt: string } };
  projection: AnalyticsFlowProjectionPoint[];
  upcoming: { incomingTotal: AnalyticsMoneyDto; outgoingTotal: AnalyticsMoneyDto; incomingCount: number; outgoingCount: number; nextIncomingAt?: string; nextOutgoingAt?: string };
  insights: AnalyticsFlowInsight[];
};

function decimal(value: string): ExactDecimal { return ExactDecimal.from(value); }
function money(value: string, currency: string): AnalyticsMoneyDto { return { value: decimal(value).toFixed(2), currency }; }
function signed(fact: AnalyticsFlowFact): string { return balanceImpact(fact.type, fact.amount.value); }
function absolute(value: string): string { return decimal(value).compare(decimal('0')) < 0 ? decimal('0').subtract(decimal(value)).toString() : value; }
export function calculateSignedFlowDelta(fact: AnalyticsFlowFact): AnalyticsMoneyDto { return money(signed(fact), fact.amount.currency); }
function date(value: string): Date { return new Date(value); }
function day(value: string): string { return value.slice(0, 10); }
function daysBetween(start: string, end: string): number { return Math.max(1, Math.round((date(end).getTime() - date(start).getTime()) / 86_400_000)); }
function addDays(value: string, count: number): string { const result = new Date(`${value}T00:00:00.000Z`); result.setUTCDate(result.getUTCDate() + count); return result.toISOString().slice(0, 10); }
function phase(fact: AnalyticsFlowFact, now: string): 'posted' | 'projected' { return fact.source === 'posted' || fact.effectiveAt < now ? 'posted' : 'projected'; }

export function buildFlowProjection(input: { openingBalance: AnalyticsMoneyDto; facts: AnalyticsFlowFact[]; window: AnalyticsFlowReport['window']; now: string }): AnalyticsFlowProjectionPoint[] {
  const facts = [...input.facts].filter((fact) => fact.effectiveAt >= input.window.start && fact.effectiveAt < input.window.endExclusive).sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt) || left.id.localeCompare(right.id));
  const points: AnalyticsFlowProjectionPoint[] = [{ occurredAt: input.window.start, balance: input.openingBalance, phase: 'posted' }];
  let balance = decimal(input.openingBalance.value);
  for (const fact of facts) {
    balance = balance.add(decimal(signed(fact)));
    const previous = points.at(-1);
    if (previous?.occurredAt === fact.effectiveAt) previous.balance = money(balance.toString(), input.openingBalance.currency);
    else points.push({ occurredAt: fact.effectiveAt, balance: money(balance.toString(), input.openingBalance.currency), phase: phase(fact, input.now) });
  }
  points.push({ occurredAt: input.window.endExclusive, balance: money(balance.toString(), input.openingBalance.currency), phase: facts.some((fact) => phase(fact, input.now) === 'projected') ? 'projected' : 'posted' });
  return points;
}

export function calculateFlowSummary(projection: AnalyticsFlowProjectionPoint[], currency: string, currentBalance: AnalyticsMoneyDto | undefined) {
  const lowest = projection.reduce((result, point) => decimal(point.balance.value).compare(decimal(result.amount.value)) < 0 ? { amount: point.balance, occurredAt: point.occurredAt } : result, { amount: projection[0]?.balance ?? money('0', currency), occurredAt: projection[0]?.occurredAt ?? '' });
  const highest = projection.reduce((result, point) => decimal(point.balance.value).compare(decimal(result.amount.value)) > 0 ? { amount: point.balance, occurredAt: point.occurredAt } : result, { amount: projection[0]?.balance ?? money('0', currency), occurredAt: projection[0]?.occurredAt ?? '' });
  const opening = projection[0]?.balance ?? money('0', currency);
  const end = projection.at(-1)?.balance ?? opening;
  return { openingBalance: opening, currentBalance, endBalance: end, netFlow: money(decimal(end.value).subtract(decimal(opening.value)).toString(), currency), lowestBalance: lowest, highestBalance: highest };
}

export function calculateUpcomingFlow(facts: AnalyticsFlowFact[], window: AnalyticsFlowReport['window'], now: string, currency: string) {
  const upcoming = facts.filter((fact) => fact.effectiveAt >= now && fact.effectiveAt >= window.start && fact.effectiveAt < window.endExclusive && fact.source !== 'posted');
  const incoming = upcoming.filter((fact) => isBalanceInflow(fact.type)).sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  const outgoing = upcoming.filter((fact) => isBalanceOutflow(fact.type)).sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  return { incomingTotal: money(incoming.reduce((sum, fact) => decimal(sum).add(decimal(absolute(signed(fact)))).toString(), '0'), currency), outgoingTotal: money(outgoing.reduce((sum, fact) => decimal(sum).add(decimal(absolute(signed(fact)))).toString(), '0'), currency), incomingCount: incoming.length, outgoingCount: outgoing.length, nextIncomingAt: incoming[0]?.effectiveAt, nextOutgoingAt: outgoing[0]?.effectiveAt };
}

export function buildFlowInsights(facts: AnalyticsFlowFact[], projection: AnalyticsFlowProjectionPoint[], window: AnalyticsFlowReport['window'], currency: string): AnalyticsFlowInsight[] {
  const buckets: Array<{ date: string; net: string }> = [];
  for (let cursor = window.start; cursor < window.endExclusive; cursor = addDays(cursor, 1)) buckets.push({ date: cursor, net: '0' });
  for (const fact of facts) { const bucket = buckets.find((item) => item.date === day(fact.effectiveAt)); if (bucket) bucket.net = decimal(bucket.net).add(decimal(signed(fact))).toString(); }
  const best = buckets.reduce((a, b) => decimal(b.net).compare(decimal(a.net)) > 0 ? b : a, buckets[0] ?? { date: window.start, net: '0' });
  const worst = buckets.reduce((a, b) => decimal(b.net).compare(decimal(a.net)) < 0 ? b : a, buckets[0] ?? { date: window.start, net: '0' });
  const inflow = facts.filter((fact) => decimal(signed(fact)).compare(decimal('0')) > 0).sort((a, b) => decimal(signed(b)).compare(decimal(signed(a))) || a.effectiveAt.localeCompare(b.effectiveAt) || a.id.localeCompare(b.id))[0];
  const highest = projection.reduce((a, b) => decimal(b.balance.value).compare(decimal(a.balance.value)) > 0 ? b : a, projection[0] ?? { occurredAt: window.start, balance: money('0', currency), phase: 'posted' as const });
  const lowest = projection.reduce((a, b) => decimal(b.balance.value).compare(decimal(a.balance.value)) < 0 ? b : a, projection[0] ?? { occurredAt: window.start, balance: money('0', currency), phase: 'posted' as const });
  const total = buckets.reduce((sum, item) => decimal(sum).add(decimal(item.net)).toString(), '0');
  return [
    { key: 'bestPeriod', amount: money(best.net, currency), occurredAt: best.date },
    { key: 'worstPeriod', amount: money(worst.net, currency), occurredAt: worst.date },
    { key: 'averageDailyFlow', amount: money(decimal(total).ratioToTruncated(decimal(String(daysBetween(window.start, window.endExclusive))), 2).toString(), currency) },
    { key: 'highestBalance', amount: highest.balance, occurredAt: highest.occurredAt },
    { key: 'lowestBalance', amount: lowest.balance, occurredAt: lowest.occurredAt },
    { key: 'largestInflow', amount: inflow ? money(signed(inflow), currency) : money('0', currency), occurredAt: inflow?.effectiveAt },
  ];
}

export function buildAnalyticsFlowReport(input: { window: AnalyticsFlowReport['window']; windowRelation: 'current' | 'past'; projectionMode: AnalyticsFlowReport['projectionMode']; currency: string; openingBalance: AnalyticsMoneyDto; currentBalance?: AnalyticsMoneyDto; facts: AnalyticsFlowFact[]; now: string }): AnalyticsFlowReport {
  const projection = buildFlowProjection({ openingBalance: input.openingBalance, facts: input.facts, window: input.window, now: input.now });
  return { window: input.window, windowRelation: input.windowRelation, projectionMode: input.projectionMode, currency: input.currency, summary: calculateFlowSummary(projection, input.currency, input.currentBalance), projection, upcoming: calculateUpcomingFlow(input.facts, input.window, input.now, input.currency), insights: buildFlowInsights(input.facts, projection, input.window, input.currency) };
}

export type AnalyticsFlowPeriod = AnalyticsPeriod;
