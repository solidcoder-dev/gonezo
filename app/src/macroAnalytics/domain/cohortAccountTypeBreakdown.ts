import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { hasBalanceContribution } from './contributionCapabilities';
import { exactMedian } from './decimalStatistics';
import { MACRO_ACCOUNT_TYPE_ORDER } from './accountBalanceContribution';
import type { MacroAccountTypeCode } from './macroAccountTypeCode';

export type CohortAccountTypeBreakdownItem = Readonly<{
  accountType: MacroAccountTypeCode;
  totalBalanceAmount: string;
  medianBalanceAmount: string;
  totalAccountCount: number;
  contributorCountWithType: number;
  contributorPercent: string;
}>;

export type CohortAccountTypeBreakdown = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  eligibleContributorCount: number;
  items: readonly CohortAccountTypeBreakdownItem[];
}>;

export function buildCohortAccountTypeBreakdown(input: Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
  contributions: readonly MacroAnalyticsContribution[];
}>): CohortAccountTypeBreakdown {
  const currency = input.currency.trim().toUpperCase();
  const eligible = input.contributions.flatMap((contribution) => {
    if (contribution.period.value !== input.period.value || !hasBalanceContribution(contribution) || !input.cohort.includes(contribution.dimensions)) return [];
    const balanceCurrency = contribution.balances.currencies.find((item) => item.currency === currency);
    return balanceCurrency ? [balanceCurrency.buckets] : [];
  });
  const items = MACRO_ACCOUNT_TYPE_ORDER.flatMap((accountType) => {
    const buckets = eligible.map((contributorBuckets) => contributorBuckets.find((bucket) => bucket.accountType === accountType));
    const totalAccountCount = buckets.reduce((sum, bucket) => sum + (bucket?.accountCount ?? 0), 0);
    if (totalAccountCount === 0) return [];
    const totalBalance = buckets.reduce((sum, bucket) => sum.add(ExactDecimal.from(bucket?.balanceAmount ?? '0')), ExactDecimal.from('0'));
    const medianBalance = exactMedian(buckets.map((bucket) => ExactDecimal.from(bucket?.balanceAmount ?? '0')))!;
    const contributorCountWithType = buckets.filter((bucket) => (bucket?.accountCount ?? 0) > 0).length;
    const contributorPercent = ExactDecimal.from(String(contributorCountWithType))
      .ratioTo(ExactDecimal.from(String(eligible.length)), 4)
      .multiplyByInteger(100)
      .toString();
    return [Object.freeze({ accountType, totalBalanceAmount: totalBalance.toString(), medianBalanceAmount: medianBalance.toString(), totalAccountCount, contributorCountWithType, contributorPercent })];
  });
  return Object.freeze({ period: input.period, currency, cohort: input.cohort, eligibleContributorCount: eligible.length, items: Object.freeze(items) });
}
