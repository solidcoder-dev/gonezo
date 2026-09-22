import { defineMetric, moneyMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';
import { exactMedian } from '../domain/decimalStatistics';

function definition(key: string): MetricDefinition {
  return defineMetric({ key, valueKind: 'MONEY' });
}

export const medianPostedIncome = definition('median_posted_income');
export const medianPostedExpense = definition('median_posted_expense');
export const medianExpectedExpense = definition('median_expected_expense');
export const medianScheduledExpense = definition('median_scheduled_expense');

function medianCalculator(metricDefinition: MetricDefinition, contributorMetricId: string): CohortMetricCalculator {
  return Object.freeze({
    definition: metricDefinition,
    contributorMetricId,
    calculate({ contributors, currency }) {
      const eligible = contributors.map(({ result }) => result.value)
        .filter((value): value is Extract<MetricValue, { kind: 'MONEY' }> => value.kind === 'MONEY' && value.currency === currency)
        .map((value) => value.value);
      const value = exactMedian(eligible);
      if (!value) return null;
      return Object.freeze({ value: moneyMetricValue(value, currency), contributorCount: eligible.length });
    },
  });
}

export const cohortFinancialMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  medianCalculator(medianPostedIncome, 'posted_income_total:v1'),
  medianCalculator(medianPostedExpense, 'posted_expense_total:v1'),
  medianCalculator(medianExpectedExpense, 'expected_expense_total:v1'),
  medianCalculator(medianScheduledExpense, 'scheduled_expense_total:v1'),
]);

export const cohortFinancialMetricDefinitions = Object.freeze({ medianPostedIncome, medianPostedExpense, medianExpectedExpense, medianScheduledExpense });
