import { countMetricValue, createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';
import { exactMedian } from '../domain/decimalStatistics';

function definition(key: string, kind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), kind);
}

export const medianPeriodEndAccountBalance = definition('median_period_end_account_balance', 'MONEY');
export const totalAccountCount = definition('total_account_count', 'COUNT');

export const cohortBalanceMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  Object.freeze({
    definition: medianPeriodEndAccountBalance,
    contributorMetricId: 'period_end_account_balance:v1',
    calculate({ contributors, currency }) {
      const values = contributors.map(({ result }) => result.value)
        .filter((value): value is Extract<MetricValue, { kind: 'MONEY' }> => value.kind === 'MONEY' && value.currency === currency)
        .map(({ value }) => value);
      const median = exactMedian(values);
      return median ? { value: moneyMetricValue(median, currency), contributorCount: values.length } : null;
    },
  }),
  Object.freeze({
    definition: totalAccountCount,
    contributorMetricId: 'account_count:v1',
    calculate({ contributors }) {
      const counts = contributors.map(({ result }) => result.value)
        .filter((value): value is Extract<MetricValue, { kind: 'COUNT' }> => value.kind === 'COUNT');
      return counts.length === 0 ? null : { value: countMetricValue(counts.reduce((sum, { value }) => sum + value, 0)), contributorCount: counts.length };
    },
  }),
]);

export const cohortBalanceMetricDefinitions = Object.freeze({ medianPeriodEndAccountBalance, totalAccountCount });
