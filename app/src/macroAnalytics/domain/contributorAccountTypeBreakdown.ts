import type { AnalyticsPeriod } from './analyticsPeriod';
import type { AccountBalanceContributionBucket } from './accountBalanceContribution';
import { MACRO_ACCOUNT_TYPE_ORDER } from './accountBalanceContribution';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { balanceCurrencyForContribution } from './accountBalanceEligibility';

export type ContributorAccountTypeBreakdown = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  items: readonly AccountBalanceContributionBucket[];
}>;

export function buildContributorAccountTypeBreakdown(
  contribution: MacroAnalyticsContribution,
  currency: string,
): ContributorAccountTypeBreakdown | null {
  const normalizedCurrency = currency.trim().toUpperCase();
  const balanceCurrency = balanceCurrencyForContribution(contribution, normalizedCurrency);
  if (!balanceCurrency) return null;
  const items = [...balanceCurrency.buckets].sort((left, right) => MACRO_ACCOUNT_TYPE_ORDER.indexOf(left.accountType) - MACRO_ACCOUNT_TYPE_ORDER.indexOf(right.accountType));
  return Object.freeze({ period: contribution.period, currency: normalizedCurrency, items: Object.freeze(items) });
}
