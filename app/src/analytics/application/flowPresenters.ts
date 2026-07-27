import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { buildNiceYAxisRange, selectEvenlySpacedIndexes } from '../../shared/ui/Chart/chartScale';
import type { AnalyticsFlowReport } from './analyticsFlowReport';

export type FlowViewModel = {
  windowLabel: string; canGoPrevious: boolean; canGoNext: boolean; windowRelation: 'current' | 'past'; projectionMode: AnalyticsFlowReport['projectionMode'];
  summary: { openingLabel: string; opening: string; endLabel: string; end: string; lowest: string; lowestDate: string };
  chart: { currentMarkerAt?: string; lowestAt: string; points: Array<{ key: string; occurredAt: string; label: string; balance: number; phase: 'posted' | 'projected' }>; domain: [number, number]; ticks: number[] };
  upcoming: { incoming: string; outgoing: string; incomingText: string; outgoingText: string };
  insights: Array<{ key: string; title: string; supportingText: string; amount: string; tone: 'income' | 'expense' | 'neutral'; icon: string }>;
};

function dateLabel(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value));
}
function rangeLabel(start: string, endExclusive: string): string {
  const end = new Date(`${endExclusive}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const startLabel = dateLabel(start);
  const endLabel = dateLabel(end.toISOString());
  return startDate.getUTCFullYear() === end.getUTCFullYear() ? `${startLabel} – ${endLabel} ${end.getUTCFullYear()}` : `${startLabel} ${startDate.getUTCFullYear()} – ${endLabel} ${end.getUTCFullYear()}`;
}
function daysInWindow(start: string, endExclusive: string): number {
  return Math.round((new Date(`${endExclusive}T00:00:00.000Z`).getTime() - new Date(`${start}T00:00:00.000Z`).getTime()) / 86_400_000);
}
function axisBucketLabel(occurredAt: string, windowStart: string, windowDays: number): string {
  const dayOffset = Math.max(0, Math.floor((new Date(occurredAt).getTime() - new Date(`${windowStart}T00:00:00.000Z`).getTime()) / 86_400_000));
  if (windowDays <= 14) return `D${dayOffset + 1}`;
  if (windowDays <= 93) return `W${Math.floor(dayOffset / 7) + 1}`;
  if (windowDays <= 730) return new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(occurredAt));
  return new Date(occurredAt).getUTCFullYear().toString();
}
function insightTitle(key: string): string { return ({ bestPeriod: 'Best period', worstPeriod: 'Worst period', averageDailyFlow: 'Average daily flow', highestBalance: 'Highest balance', lowestBalance: 'Lowest balance', largestInflow: 'Largest inflow' } as Record<string, string>)[key] ?? key; }
function insightTone(key: string): 'income' | 'expense' | 'neutral' { return key === 'worstPeriod' || key === 'lowestBalance' ? 'expense' : key === 'bestPeriod' || key === 'largestInflow' ? 'income' : 'neutral'; }
function insightIcon(key: string): string { return key === 'worstPeriod' || key === 'lowestBalance' ? 'bi bi-arrow-down-right' : key === 'bestPeriod' || key === 'largestInflow' ? 'bi bi-arrow-up-right' : 'bi bi-activity'; }

export function presentFlowReport(report: AnalyticsFlowReport): FlowViewModel {
  const currency = report.currency;
  const windowDays = daysInWindow(report.window.start, report.window.endExclusive);
  const axisBuckets = new Set<string>();
  const points = report.projection.map((point) => {
    const isEndAnchor = point.occurredAt.slice(0, 10) >= report.window.endExclusive;
    const bucketLabel = isEndAnchor ? '' : axisBucketLabel(point.occurredAt, report.window.start, windowDays);
    const label = bucketLabel && !axisBuckets.has(bucketLabel) ? bucketLabel : '';
    if (bucketLabel) axisBuckets.add(bucketLabel);
    return { key: point.occurredAt, occurredAt: point.occurredAt, label, balance: Number(point.balance.value), phase: point.phase };
  });
  const labelledIndexes = points.map((point, index) => point.label ? index : -1).filter((index) => index >= 0);
  const visibleIndexes = new Set(selectEvenlySpacedIndexes(labelledIndexes.length).map((index) => labelledIndexes[index]));
  for (const [index, point] of points.entries()) {
    if (point.label && !visibleIndexes.has(index)) points[index] = { ...point, label: '' };
  }
  const scale = buildNiceYAxisRange(points.map((point) => point.balance));
  const current = report.windowRelation === 'current' ? points.find((point) => point.occurredAt >= report.window.start && point.occurredAt < report.window.endExclusive && point.occurredAt >= new Date().toISOString()) : undefined;
  return {
    windowLabel: rangeLabel(report.window.start, report.window.endExclusive), canGoPrevious: report.window.canGoPrevious, canGoNext: report.window.canGoNext,
    windowRelation: report.windowRelation,
    projectionMode: report.projectionMode,
    summary: { openingLabel: report.windowRelation === 'current' ? 'Current balance' : 'Opening balance', opening: formatCurrencyAmount(report.windowRelation === 'current' ? (report.summary.currentBalance ?? report.summary.openingBalance).value : report.summary.openingBalance.value, currency), endLabel: report.windowRelation === 'past' && report.projectionMode === 'filteredImpact' ? 'Filtered end balance' : report.windowRelation === 'past' ? 'End balance' : report.projectionMode === 'filteredImpact' ? 'Filtered end balance' : 'Expected end balance', end: formatCurrencyAmount(report.summary.endBalance.value, currency), lowest: formatCurrencyAmount(report.summary.lowestBalance.amount.value, currency), lowestDate: dateLabel(report.summary.lowestBalance.occurredAt) },
    chart: { currentMarkerAt: current?.occurredAt, lowestAt: report.summary.lowestBalance.occurredAt, points, domain: scale.domain, ticks: scale.ticks },
    upcoming: { incoming: formatCurrencyAmount(report.upcoming.incomingTotal.value, currency), outgoing: formatCurrencyAmount(report.upcoming.outgoingTotal.value, currency), incomingText: report.upcoming.incomingCount ? `${report.upcoming.incomingCount} movements${report.upcoming.nextIncomingAt ? ` · ${dateLabel(report.upcoming.nextIncomingAt)}` : ''}` : 'No upcoming movements', outgoingText: report.upcoming.outgoingCount ? `${report.upcoming.outgoingCount} movements${report.upcoming.nextOutgoingAt ? ` · ${dateLabel(report.upcoming.nextOutgoingAt)}` : ''}` : 'No upcoming movements' },
    insights: report.insights.map((insight) => ({ key: insight.key, title: insightTitle(insight.key), supportingText: insight.occurredAt ? dateLabel(insight.occurredAt) : insight.key === 'largestInflow' && insight.amount.value === '0.00' ? 'No inflows' : 'Selected window', amount: formatCurrencyAmount(insight.amount.value, currency), tone: insightTone(insight.key), icon: insightIcon(insight.key) })),
  };
}
