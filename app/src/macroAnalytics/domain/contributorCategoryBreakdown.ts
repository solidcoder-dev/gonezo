import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { AnalyticsPeriod } from './analyticsPeriod';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import type { FinancialFactKind, FinancialFactSource } from './financialFact';
import type { MacroCategoryCode } from './macroCategoryCode';

export type ContributorCategoryBreakdown = Readonly<{
  period: AnalyticsPeriod;
  currency: string;
  items: readonly Readonly<{ category: MacroCategoryCode; amount: CategoryMoneyAmount }>[];
}>;

export type CategoryMoneyAmount = Readonly<{ kind: 'MONEY'; value: ExactDecimal; currency: string }>;

export function buildContributorCategoryBreakdown(
  contribution: MacroAnalyticsContribution,
  currency: string,
  source: FinancialFactSource,
  kind: Extract<FinancialFactKind, 'INCOME' | 'EXPENSE'>,
): ContributorCategoryBreakdown | null {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (contribution.schemaVersion !== 2 || !contribution.financial.currencies.some(({ currency: code }) => code === normalizedCurrency)) return null;
  const currencyCategories = contribution.categories.currencies.find(({ currency: code }) => code === normalizedCurrency);
  const items = (currencyCategories?.buckets ?? [])
    .filter((bucket) => bucket.source === source && bucket.kind === kind)
    .map(({ category, amount }) => ({ category, amount: categoryMoneyAmount(amount, normalizedCurrency) }))
    .sort((left, right) => right.amount.value.compare(left.amount.value) || compareText(left.category, right.category));
  return Object.freeze({ period: contribution.period, currency: normalizedCurrency, items: Object.freeze(items) });
}

function categoryMoneyAmount(amount: string, currency: string): CategoryMoneyAmount {
  return Object.freeze({ kind: 'MONEY', value: ExactDecimal.from(amount), currency });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
