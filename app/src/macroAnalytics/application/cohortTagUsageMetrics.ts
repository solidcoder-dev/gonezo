import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, type MetricDefinition } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';
import { exactMedian } from '../domain/decimalStatistics';
import { hasTagUsageContribution } from '../domain/contributionCapabilities';
import { contributorTagUsageMetricDefinitions } from './contributorTagUsageMetrics';

function definition(key: string, kind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), kind);
}

export const medianTaggedPostedExpense = definition('median_tagged_posted_expense', 'MONEY');
export const medianTaggedPostedExpenseSharePercent = definition('median_tagged_posted_expense_share_percent', 'RATIO');
export const medianTaggedPostedExpenseMovementPercent = definition('median_tagged_posted_expense_movement_percent', 'RATIO');
export const taggedPostedExpenseContributorPercent = definition('tagged_posted_expense_contributor_percent', 'RATIO');

function medianCalculator(definitionValue: MetricDefinition, contributorMetricId: string, kind: 'MONEY' | 'RATIO'): CohortMetricCalculator {
  return Object.freeze({
    definition: definitionValue,
    contributorMetricId,
    calculate({ contributors, currency }) {
      const values = contributors.flatMap(({ result }) => {
        const value = result.value;
        if (kind === 'MONEY') return value.kind === 'MONEY' && value.currency === currency ? [value.value] : [];
        return value.kind === 'RATIO' ? [value.value] : [];
      });
      const median = exactMedian(values);
      if (!median) return null;
      return { value: kind === 'MONEY' ? moneyMetricValue(median, currency) : ratioMetricValue(median), contributorCount: values.length };
    },
  });
}

const adoptionCalculator: CohortMetricCalculator = Object.freeze({
  definition: taggedPostedExpenseContributorPercent,
  calculate({ contributions, currency }) {
    const eligible = contributions.flatMap((contribution) => {
      if (!hasTagUsageContribution(contribution)) return [];
      const bucket = contribution.tagUsage.currencies.find((entry) => entry.currency === currency)
        ?.buckets.find((entry) => entry.source === 'POSTED' && entry.kind === 'EXPENSE');
      return bucket && bucket.movementCount > 0 ? [bucket] : [];
    });
    if (eligible.length === 0) return null;
    const activeCount = eligible.filter(({ taggedMovementCount }) => taggedMovementCount > 0).length;
    const percent = ExactDecimal.from(String(activeCount)).ratioTo(ExactDecimal.from(String(eligible.length)), 4).multiplyByInteger(100);
    return { value: ratioMetricValue(percent), contributorCount: eligible.length };
  },
});

export const cohortTagUsageMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  medianCalculator(medianTaggedPostedExpense, `${contributorTagUsageMetricDefinitions.taggedPostedExpenseTotal.id.toString()}`, 'MONEY'),
  medianCalculator(medianTaggedPostedExpenseSharePercent, contributorTagUsageMetricDefinitions.taggedPostedExpenseSharePercent.id.toString(), 'RATIO'),
  medianCalculator(medianTaggedPostedExpenseMovementPercent, contributorTagUsageMetricDefinitions.taggedPostedExpenseMovementPercent.id.toString(), 'RATIO'),
  adoptionCalculator,
]);

export const cohortTagUsageMetricDefinitions = Object.freeze({ medianTaggedPostedExpense, medianTaggedPostedExpenseSharePercent, medianTaggedPostedExpenseMovementPercent, taggedPostedExpenseContributorPercent });
export const cohortTagUsageMetricIds = Object.freeze(Object.values(cohortTagUsageMetricDefinitions).map(({ id }) => id));
