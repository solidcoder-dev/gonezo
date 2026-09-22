import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { countMetricValue, defineMetric, moneyMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { ContributorMetricCalculator } from '../domain/contributorMetric';
import type { FinancialFactKind, FinancialFactSource } from '../domain/financialFact';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';

function definition(key: string, valueKind: MetricDefinition['valueKind']): MetricDefinition {
  return defineMetric({ key, valueKind });
}

export const postedIncomeTotal = definition('posted_income_total', 'MONEY');
export const postedExpenseTotal = definition('posted_expense_total', 'MONEY');
export const expectedExpenseTotal = definition('expected_expense_total', 'MONEY');
export const scheduledExpenseTotal = definition('scheduled_expense_total', 'MONEY');
export const postedExpenseCount = definition('posted_expense_count', 'COUNT');

function financialBucketMetric(
  metricDefinition: MetricDefinition,
  source: FinancialFactSource,
  kind: FinancialFactKind,
): ContributorMetricCalculator {
  return Object.freeze({
    definition: metricDefinition,
    calculate(contribution: MacroAnalyticsContribution, currency?: string): MetricValue | null {
      if (!currency) throw new Error(`Currency is required for ${metricDefinition.id.toString()}`);
      const normalizedCurrency = currency.trim().toUpperCase();
      const currencyContribution = contribution.financial.currencies.find((entry) => entry.currency === normalizedCurrency);
      if (!currencyContribution) return null;
      const bucket = currencyContribution.buckets.find((entry) => entry.source === source && entry.kind === kind);
      if (metricDefinition.valueKind === 'COUNT') return countMetricValue(bucket?.count ?? 0);
      return moneyMetricValue(ExactDecimal.from(bucket?.amount ?? '0'), normalizedCurrency);
    },
  });
}

export const contributorFinancialMetricCalculators: readonly ContributorMetricCalculator[] = Object.freeze([
  financialBucketMetric(postedIncomeTotal, 'POSTED', 'INCOME'),
  financialBucketMetric(postedExpenseTotal, 'POSTED', 'EXPENSE'),
  financialBucketMetric(expectedExpenseTotal, 'EXPECTED', 'EXPENSE'),
  financialBucketMetric(scheduledExpenseTotal, 'SCHEDULED', 'EXPENSE'),
  financialBucketMetric(postedExpenseCount, 'POSTED', 'EXPENSE'),
]);

export const contributorFinancialMetricDefinitions = Object.freeze({
  postedIncomeTotal,
  postedExpenseTotal,
  expectedExpenseTotal,
  scheduledExpenseTotal,
  postedExpenseCount,
});
