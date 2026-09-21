import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { ContributorMetricCalculator } from '../domain/contributorMetric';
import { hasRecurringContribution } from '../domain/contributionCapabilities';
import type { RecurringFactSource } from '../domain/recurringFact';
import type { MacroAnalyticsContribution, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4, MacroAnalyticsContributionV5, MacroAnalyticsContributionV6 } from '../domain/macroAnalyticsContribution';

function definition(key: string, valueKind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

export const recurringPostedExpenseTotal = definition('recurring_posted_expense_total', 'MONEY');
export const recurringExpectedExpenseTotal = definition('recurring_expected_expense_total', 'MONEY');
export const recurringScheduledExpenseTotal = definition('recurring_scheduled_expense_total', 'MONEY');
export const recurringPostedExpenseSharePercent = definition('recurring_posted_expense_share_percent', 'RATIO');

function recurringExpenseTotal(metricDefinition: MetricDefinition, source: RecurringFactSource): ContributorMetricCalculator {
  return Object.freeze({
    definition: metricDefinition,
    calculate(contribution: MacroAnalyticsContribution, currency?: string): MetricValue | null {
      const normalizedCurrency = selectedFinancialCurrency(contribution, currency);
      if (!normalizedCurrency || !hasRecurringContribution(contribution)) return null;
      return moneyMetricValue(ExactDecimal.from(recurringExpenseAmount(contribution, normalizedCurrency, source)), normalizedCurrency);
    },
  });
}

const recurringPostedExpenseShareCalculator: ContributorMetricCalculator = Object.freeze({
  definition: recurringPostedExpenseSharePercent,
  calculate(contribution, currency) {
    const normalizedCurrency = selectedFinancialCurrency(contribution, currency);
    if (!normalizedCurrency || !hasRecurringContribution(contribution)) return null;
    const financial = contribution.financial.currencies.find((entry) => entry.currency === normalizedCurrency);
    const postedExpense = ExactDecimal.from(financial?.buckets.find((entry) => entry.source === 'POSTED' && entry.kind === 'EXPENSE')?.amount ?? '0');
    if (postedExpense.compare(ExactDecimal.from('0')) === 0) return null;
    const recurringAmount = recurringExpenseAmount(contribution, normalizedCurrency, 'POSTED');
    return ratioMetricValue(ExactDecimal.from(recurringAmount).ratioTo(postedExpense, 4).multiplyByInteger(100));
  },
});

function recurringExpenseAmount(contribution: MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6, currency: string, source: RecurringFactSource): string {
  return contribution.recurring.currencies.find((entry) => entry.currency === currency)?.buckets
    .find((entry) => entry.source === source && entry.kind === 'EXPENSE')?.amount ?? '0';
}

function selectedFinancialCurrency(contribution: MacroAnalyticsContribution, currency?: string): string | null {
  const normalizedCurrency = currency?.trim().toUpperCase();
  if (!normalizedCurrency || !contribution.financial.currencies.some((entry) => entry.currency === normalizedCurrency)) return null;
  return normalizedCurrency;
}

export const contributorRecurringMetricCalculators: readonly ContributorMetricCalculator[] = Object.freeze([
  recurringExpenseTotal(recurringPostedExpenseTotal, 'POSTED'),
  recurringExpenseTotal(recurringExpectedExpenseTotal, 'EXPECTED'),
  recurringExpenseTotal(recurringScheduledExpenseTotal, 'SCHEDULED'),
  recurringPostedExpenseShareCalculator,
]);

export const contributorRecurringMetricDefinitions = Object.freeze({
  recurringPostedExpenseTotal,
  recurringExpectedExpenseTotal,
  recurringScheduledExpenseTotal,
  recurringPostedExpenseSharePercent,
});
