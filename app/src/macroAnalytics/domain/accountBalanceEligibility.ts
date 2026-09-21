import type { AnalyticsPeriod } from './analyticsPeriod';
import type { Cohort } from './cohort';
import type { AccountBalanceCurrencyContribution } from './accountBalanceContribution';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { hasBalanceContribution } from './contributionCapabilities';

export function balanceCurrencyForContribution(
  contribution: MacroAnalyticsContribution,
  currency: string,
): AccountBalanceCurrencyContribution | null {
  if (!hasBalanceContribution(contribution)) return null;
  const normalizedCurrency = currency.trim().toUpperCase();
  return contribution.balances.currencies.find((item) => item.currency === normalizedCurrency) ?? null;
}

export function eligibleBalanceContributions(input: Readonly<{
  contributions: readonly MacroAnalyticsContribution[];
  period: AnalyticsPeriod;
  currency: string;
  cohort: Cohort;
}>): readonly MacroAnalyticsContribution[] {
  return input.contributions.filter((contribution) => contribution.period.value === input.period.value
    && input.cohort.includes(contribution.dimensions)
    && balanceCurrencyForContribution(contribution, input.currency) !== null);
}
