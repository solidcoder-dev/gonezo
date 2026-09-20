import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { moneyMetricValue, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import type { MacroCategoryCode } from './macroCategoryCode';
import { buildContributorCategoryBreakdown } from './contributorCategoryBreakdown';
import { exactMedian } from './decimalStatistics';

export type CohortCategoryBreakdownItem = Readonly<{
  category: MacroCategoryCode;
  totalAmount: Extract<MetricValue, { kind: 'MONEY' }>;
  medianAmount: Extract<MetricValue, { kind: 'MONEY' }>;
  activeContributorCount: number;
  sharePercent: string;
}>;

export type CohortCategoryBreakdown = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  items: readonly CohortCategoryBreakdownItem[];
}>;

export function buildCohortCategoryBreakdown(input: Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributions: readonly MacroAnalyticsContribution[];
}>): CohortCategoryBreakdown {
  const currency = input.currency.trim().toUpperCase();
  const eligible = input.contributions.filter((contribution) => contribution.schemaVersion === 2
    && contribution.period.value === input.period.value
    && input.cohort.includes(contribution.dimensions)
    && contribution.financial.currencies.some(({ currency: code }) => code === currency));
  const perContributor = eligible.map((contribution) => buildContributorCategoryBreakdown(contribution, currency, 'POSTED', 'EXPENSE')!);
  const totals = new Map<MacroCategoryCode, ExactDecimal>();
  let representedExpenseTotal = ExactDecimal.from('0');
  for (const breakdown of perContributor) for (const { category, amount } of breakdown.items) {
    totals.set(category, (totals.get(category) ?? ExactDecimal.from('0')).add(amount.value));
    representedExpenseTotal = representedExpenseTotal.add(amount.value);
  }
  const items = [...totals.entries()]
    .filter(([, total]) => total.compare(ExactDecimal.from('0')) > 0)
    .map(([category, total]) => {
      const contributorAmounts = perContributor.map((breakdown) => breakdown.items.find((item) => item.category === category)?.amount.value ?? ExactDecimal.from('0'));
      const median = exactMedian(contributorAmounts)!;
      const activeContributorCount = contributorAmounts.filter((amount) => amount.compare(ExactDecimal.from('0')) > 0).length;
      return Object.freeze({
        category,
        totalAmount: moneyMetricValue(total, currency) as Extract<MetricValue, { kind: 'MONEY' }>,
        medianAmount: moneyMetricValue(median, currency) as Extract<MetricValue, { kind: 'MONEY' }>,
        activeContributorCount,
        sharePercent: total.ratioTo(representedExpenseTotal, 4).multiplyByInteger(100).toString(),
      });
    })
    .sort((left, right) => right.totalAmount.value.compare(left.totalAmount.value) || compareText(left.category, right.category));
  return Object.freeze({ period: input.period, currency, cohort: input.cohort, eligibleContributorCount: eligible.length, items: Object.freeze(items) });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
