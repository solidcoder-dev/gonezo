import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';

function definition(key: string): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), 'MONEY');
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
        .map((value) => value.value).sort((left, right) => left.compare(right));
      if (eligible.length === 0) return null;
      const middle = Math.floor(eligible.length / 2);
      const value = eligible.length % 2 === 1 ? eligible[middle] : eligible[middle - 1].add(eligible[middle]).ratioTo(
        ExactDecimal.from(2),
        Math.max(decimalPlaces(eligible[middle - 1]), decimalPlaces(eligible[middle])) + 1,
      );
      return Object.freeze({ value: moneyMetricValue(value, currency), contributorCount: eligible.length });
    },
  });
}

function decimalPlaces(value: ExactDecimal): number {
  return value.toString().split('.')[1]?.length ?? 0;
}

export const cohortFinancialMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  medianCalculator(medianPostedIncome, 'posted_income_total:v1'),
  medianCalculator(medianPostedExpense, 'posted_expense_total:v1'),
  medianCalculator(medianExpectedExpense, 'expected_expense_total:v1'),
  medianCalculator(medianScheduledExpense, 'scheduled_expense_total:v1'),
]);

export const cohortFinancialMetricDefinitions = Object.freeze({ medianPostedIncome, medianPostedExpense, medianExpectedExpense, medianScheduledExpense });
