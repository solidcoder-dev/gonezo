import { formatCurrencyAmount, formatIsoDate } from '../../shared/utils/formatting';
import type { AnalyticsTopExpensesResult } from './analytics.port';
import type { AnalyticsSpendingReport } from './spendingReport';

export type SpendingChartScaleView = {
  axisMax: number;
  ticks: number[];
  bars: Array<{ heightPercent: number; amount: number; label: string }>;
};

export type SpendingReportViewModel = {
  window: { start: string; endExclusive: string; canGoPrevious: boolean; canGoNext: boolean };
  periodLabel: string;
  rangeLabel: string;
  range: { start: string; startYear: string; end: string; endYear: string; sameYear: boolean };
  totalAmount: string;
  comparison?: { direction: 'up' | 'down' | 'flat'; percentage: string };
  categories: Array<{ key: string; name: string; icon: string; color: string; amount: string; percentage: string; widthPercent: number }>;
  allCategories: Array<{ key: string; name: string; icon: string; color: string; amount: string; percentage: string; widthPercent: number }>;
  chart: SpendingChartScaleView;
};

export type TopExpensesViewModel = {
  items: Array<{ key: string; title: string; subtitle: string; amount: string; date: string; icon: string }>;
  totalCount: number;
};

function numberValue(value: string): number {
  return Number(value);
}

function categoryIcon(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes('food') || normalized.includes('restaurant')) return 'bi bi-fork-knife';
  if (normalized.includes('transport') || normalized.includes('car')) return 'bi bi-car-front-fill';
  if (normalized.includes('shop')) return 'bi bi-cart-fill';
  if (normalized.includes('travel')) return 'bi bi-suitcase-lg';
  if (normalized.includes('home')) return 'bi bi-house-fill';
  return 'bi bi-tag-fill';
}

const CATEGORY_COLORS = ['var(--category-red-soft)', 'var(--category-green-soft)', 'var(--category-yellow-soft)', 'var(--category-blue-soft)', 'var(--category-lilac-soft)', 'var(--category-cyan-soft)'];

function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
}

function rangeParts(start: string, endExclusive: string): SpendingReportViewModel['range'] {
  const end = new Date(new Date(`${endExclusive}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  return { start: dateLabel(start), startYear, end: dateLabel(end), endYear, sameYear: startYear === endYear };
}

function rangeLabel(start: string, endExclusive: string): string {
  const range = rangeParts(start, endExclusive);
  return range.sameYear
    ? `${range.start} – ${range.end} ${range.endYear}`
    : `${range.start} ${range.startYear} – ${range.end} ${range.endYear}`;
}

function timelineUnit(start: string, endExclusive: string): 'day' | 'week' | 'month' | 'year' {
  const days = Math.round((new Date(`${endExclusive}T00:00:00.000Z`).getTime() - new Date(`${start}T00:00:00.000Z`).getTime()) / 86_400_000);
  return days <= 14 ? 'day' : days <= 93 ? 'week' : days <= 730 ? 'month' : 'year';
}

function timelineLabels(report: AnalyticsSpendingReport): string[] {
  const unit = timelineUnit(report.window.start, report.window.endExclusive);
  return report.timeline.map((bucket, index) => {
    if (unit === 'day') return `D${index + 1}`;
    if (unit === 'week') return `W${index + 1}`;
    if (unit === 'year') return bucket.start.slice(0, 4);
    return new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(`${bucket.start}T00:00:00.000Z`));
  });
}

export function presentSpendingChartScale(amounts: number[], labels: string[]): SpendingChartScaleView {
  const max = Math.max(0, ...amounts);
  if (max === 0) return { axisMax: 0, ticks: [0, 0, 0, 0], bars: amounts.map((amount, index) => ({ amount, label: labels[index] ?? '', heightPercent: 0 })) };
  const roughStep = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = [1, 2, 5, 10].find((candidate) => candidate >= normalized) ?? 10;
  const step = factor * magnitude;
  const axisMax = step * 3;
  return {
    axisMax,
    ticks: [0, step, step * 2, axisMax],
    bars: amounts.map((amount, index) => ({ amount, label: labels[index] ?? '', heightPercent: Math.max(0, Math.min(100, (amount / axisMax) * 100)) })),
  };
}

export function presentSpendingSummary(report: AnalyticsSpendingReport): SpendingReportViewModel {
  const amounts = report.timeline.map((bucket) => numberValue(bucket.amount.value));
  const labels = timelineLabels(report);
  const range = rangeParts(report.window.start, report.window.endExclusive);
  const allCategories = report.categories.map((category, index) => ({
    key: category.categoryId ?? 'uncategorized',
    name: category.categoryName,
    icon: categoryIcon(category.categoryName),
    color: categoryColor(index),
    amount: formatCurrencyAmount(category.amount.value, report.currency),
    percentage: `${category.percentage.toFixed(1)}%`,
    widthPercent: Math.max(0, Math.min(100, category.percentage)),
  }));
  const visibleCategories = allCategories.length <= 4 ? allCategories : [
    ...allCategories.slice(0, 4),
    {
      key: 'others',
      name: 'Others',
      icon: 'bi bi-three-dots',
      color: 'var(--color-text-muted)',
      amount: formatCurrencyAmount(
        report.categories.slice(4).reduce((total, category) => total + Number(category.amount.value), 0).toFixed(2),
        report.currency,
      ),
      percentage: `${report.categories.slice(4).reduce((total, category) => total + category.percentage, 0).toFixed(1)}%`,
      widthPercent: report.categories.slice(4).reduce((total, category) => total + category.percentage, 0),
    },
  ];
  return {
    window: { start: report.window.start, endExclusive: report.window.endExclusive, canGoPrevious: report.window.canGoPrevious, canGoNext: report.window.canGoNext },
    periodLabel: rangeLabel(report.window.start, report.window.endExclusive),
    rangeLabel: rangeLabel(report.window.start, report.window.endExclusive),
    range,
    totalAmount: formatCurrencyAmount(report.totalExpense.value, report.currency),
    comparison: report.changePercent === undefined
      ? undefined
      : { direction: report.changePercent > 0 ? 'up' : report.changePercent < 0 ? 'down' : 'flat', percentage: `${Math.abs(report.changePercent).toFixed(1)}%` },
    categories: visibleCategories,
    allCategories,
    chart: presentSpendingChartScale(amounts, labels),
  };
}

export function presentTopExpenses(result: AnalyticsTopExpensesResult): TopExpensesViewModel {
  return {
    totalCount: result.totalCount,
    items: result.items.map((item) => ({
      key: item.movementId,
      title: item.description?.trim() || item.merchant?.trim() || item.categoryName?.trim() || 'Expense',
      subtitle: item.categoryName?.trim() || 'Uncategorized',
      amount: `-${formatCurrencyAmount(item.amount.value, item.amount.currency)}`,
      date: formatIsoDate(item.occurredAt),
      icon: categoryIcon(item.categoryName ?? 'expense'),
    })),
  };
}
