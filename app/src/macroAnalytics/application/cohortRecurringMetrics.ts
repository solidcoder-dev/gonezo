import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';
import { exactMedian } from '../domain/decimalStatistics';

function definition(key: string, valueKind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

export const medianRecurringPostedExpense = definition('median_recurring_posted_expense', 'MONEY');
export const medianRecurringExpectedExpense = definition('median_recurring_expected_expense', 'MONEY');
export const medianRecurringScheduledExpense = definition('median_recurring_scheduled_expense', 'MONEY');
export const medianRecurringPostedExpenseSharePercent = definition('median_recurring_posted_expense_share_percent', 'RATIO');

function medianCalculator(metricDefinition: MetricDefinition, contributorMetricId: string): CohortMetricCalculator {
  return Object.freeze({
    definition: metricDefinition,
    contributorMetricId,
    calculate({ contributors, currency }) {
      const eligible = contributors.map(({ result }) => result.value)
        .filter((value): value is Extract<MetricValue, { kind: 'MONEY' | 'RATIO' }> => value.kind === metricDefinition.valueKind
          && (value.kind !== 'MONEY' || value.currency === currency));
      const value = exactMedian(eligible.map((item) => item.value));
      if (!value) return null;
      const metricValue = metricDefinition.valueKind === 'MONEY' ? moneyMetricValue(value, currency) : ratioMetricValue(value);
      return Object.freeze({ value: metricValue, contributorCount: eligible.length });
    },
  });
}

export const cohortRecurringMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  medianCalculator(medianRecurringPostedExpense, 'recurring_posted_expense_total:v1'),
  medianCalculator(medianRecurringExpectedExpense, 'recurring_expected_expense_total:v1'),
  medianCalculator(medianRecurringScheduledExpense, 'recurring_scheduled_expense_total:v1'),
  medianCalculator(medianRecurringPostedExpenseSharePercent, 'recurring_posted_expense_share_percent:v1'),
]);

export const cohortRecurringMetricDefinitions = Object.freeze({
  medianRecurringPostedExpense,
  medianRecurringExpectedExpense,
  medianRecurringScheduledExpense,
  medianRecurringPostedExpenseSharePercent,
});
