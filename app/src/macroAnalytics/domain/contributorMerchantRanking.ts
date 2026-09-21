import type { AnalyticsPeriod } from './analyticsPeriod';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { FinancialFactKind, FinancialFactSource } from './financialFact';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import type { MacroMerchantCode } from './macroMerchantCode';
import { hasMerchantContribution } from './contributionCapabilities';

export type ContributorMerchantRanking = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  items: readonly Readonly<{ merchant: MacroMerchantCode; amount: string; movementCount: number }>[];
}>;

export function buildContributorMerchantRanking(
  contribution: MacroAnalyticsContribution,
  currency: string,
  source: FinancialFactSource,
  kind: Extract<FinancialFactKind, 'INCOME' | 'EXPENSE'>,
): ContributorMerchantRanking | null {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!hasMerchantContribution(contribution) || !contribution.financial.currencies.some(({ currency: code }) => code === normalizedCurrency)) return null;
  const buckets = contribution.merchants.currencies.find(({ currency: code }) => code === normalizedCurrency)?.buckets ?? [];
  const items = buckets.filter((bucket) => bucket.source === source && bucket.kind === kind)
    .map(({ merchant, amount, movementCount }) => ({ merchant, amount, movementCount }))
    .sort((left, right) => ExactDecimal.from(right.amount).compare(ExactDecimal.from(left.amount)) || right.movementCount - left.movementCount || compareText(left.merchant, right.merchant));
  return Object.freeze({ period: contribution.period, currency: normalizedCurrency, items: Object.freeze(items) });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
