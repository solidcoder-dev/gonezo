import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import type { MacroMerchantCode } from './macroMerchantCode';
import { buildContributorMerchantRanking } from './contributorMerchantRanking';
import { exactMedian } from './decimalStatistics';
import { hasMerchantContribution } from './contributionCapabilities';

export type CohortMerchantRankingItem = Readonly<{
  merchant: MacroMerchantCode;
  totalAmount: string;
  medianAmount: string;
  movementCount: number;
  activeContributorCount: number;
  shareOfPostedExpensePercent: string;
}>;

export type CohortMerchantRanking = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  catalogVersion: number | null;
  merchantCoveragePercent: string;
  items: readonly CohortMerchantRankingItem[];
}>;

export function buildCohortMerchantRanking(input: Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributions: readonly MacroAnalyticsContribution[];
}>): CohortMerchantRanking {
  const currency = input.currency.trim().toUpperCase();
  const eligible = input.contributions.filter((contribution) => hasMerchantContribution(contribution)
    && contribution.period.value === input.period.value
    && input.cohort.includes(contribution.dimensions)
    && contribution.financial.currencies.some(({ currency: code }) => code === currency));
  const rankings = eligible.map((contribution) => buildContributorMerchantRanking(contribution, currency, 'POSTED', 'EXPENSE')!);
  const denominators = eligible.map((contribution) => ExactDecimal.from(contribution.financial.currencies.find(({ currency: code }) => code === currency)?.buckets
    .find(({ source, kind }) => source === 'POSTED' && kind === 'EXPENSE')?.amount ?? '0'));
  const totalExpense = denominators.reduce((total, amount) => total.add(amount), ExactDecimal.from('0'));
  const totals = new Map<MacroMerchantCode, { amount: ExactDecimal; movementCount: number }>();
  for (const ranking of rankings) for (const item of ranking.items) {
    const total = totals.get(item.merchant) ?? { amount: ExactDecimal.from('0'), movementCount: 0 };
    total.amount = total.amount.add(ExactDecimal.from(item.amount));
    total.movementCount += item.movementCount;
    totals.set(item.merchant, total);
  }
  const items = [...totals].map(([merchant, total]) => {
    const amounts = rankings.map((ranking) => ExactDecimal.from(ranking.items.find((item) => item.merchant === merchant)?.amount ?? '0'));
    const activeContributorCount = rankings.filter((ranking) => ranking.items.some((item) => item.merchant === merchant && (ExactDecimal.from(item.amount).compare(ExactDecimal.from('0')) > 0 || item.movementCount > 0))).length;
    return Object.freeze({
      merchant,
      totalAmount: total.amount.toString(),
      medianAmount: exactMedian(amounts)?.toString() ?? '0',
      movementCount: total.movementCount,
      activeContributorCount,
      shareOfPostedExpensePercent: percentage(total.amount, totalExpense),
    });
  }).sort((left, right) => ExactDecimal.from(right.totalAmount).compare(ExactDecimal.from(left.totalAmount))
    || right.activeContributorCount - left.activeContributorCount || compareText(left.merchant, right.merchant));
  const representedExpense = [...totals.values()].reduce((sum, total) => sum.add(total.amount), ExactDecimal.from('0'));
  return Object.freeze({ period: input.period, currency, cohort: input.cohort, eligibleContributorCount: eligible.length,
    catalogVersion: eligible.length ? Math.min(...eligible.map((contribution) => hasMerchantContribution(contribution) ? contribution.merchants.catalogVersion : 0)) : null,
    merchantCoveragePercent: percentage(representedExpense, totalExpense), items: Object.freeze(items) });
}

function percentage(numerator: ExactDecimal, denominator: ExactDecimal): string {
  return denominator.compare(ExactDecimal.from('0')) === 0 ? '0' : numerator.ratioTo(denominator, 4).multiplyByInteger(100).toString();
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
