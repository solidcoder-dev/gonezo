import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, type MetricDefinition } from '../../shared/domain/analyticsMetric';
import type { ContributorMetricCalculator } from '../domain/contributorMetric';
import { hasTagUsageContribution } from '../domain/contributionCapabilities';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';

function definition(key: string, kind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), kind);
}

export const taggedPostedExpenseTotal = definition('tagged_posted_expense_total', 'MONEY');
export const taggedPostedExpenseSharePercent = definition('tagged_posted_expense_share_percent', 'RATIO');
export const taggedPostedExpenseMovementPercent = definition('tagged_posted_expense_movement_percent', 'RATIO');

function postedExpenseBucket(contribution: MacroAnalyticsContribution, currency?: string) {
  if (!hasTagUsageContribution(contribution) || !currency) return null;
  const normalizedCurrency = currency.trim().toUpperCase();
  return contribution.tagUsage.currencies.find(({ currency: code }) => code === normalizedCurrency)
    ?.buckets.find(({ source, kind }) => source === 'POSTED' && kind === 'EXPENSE') ?? null;
}

const totalCalculator: ContributorMetricCalculator = Object.freeze({
  definition: taggedPostedExpenseTotal,
  calculate(contribution, currency) {
    const bucket = postedExpenseBucket(contribution, currency);
    return bucket ? moneyMetricValue(ExactDecimal.from(bucket.taggedAmount), currency!.trim().toUpperCase()) : null;
  },
});

const shareCalculator: ContributorMetricCalculator = Object.freeze({
  definition: taggedPostedExpenseSharePercent,
  calculate(contribution, currency) {
    const bucket = postedExpenseBucket(contribution, currency);
    if (!bucket || ExactDecimal.from(bucket.amount).compare(ExactDecimal.from('0')) === 0) return null;
    return ratioMetricValue(ExactDecimal.from(bucket.taggedAmount).ratioTo(ExactDecimal.from(bucket.amount), 4).multiplyByInteger(100));
  },
});

const movementCalculator: ContributorMetricCalculator = Object.freeze({
  definition: taggedPostedExpenseMovementPercent,
  calculate(contribution, currency) {
    const bucket = postedExpenseBucket(contribution, currency);
    if (!bucket) return null;
    return ratioMetricValue(ExactDecimal.from(String(bucket.taggedMovementCount)).ratioTo(ExactDecimal.from(String(bucket.movementCount)), 4).multiplyByInteger(100));
  },
});

export const contributorTagUsageMetricCalculators: readonly ContributorMetricCalculator[] = Object.freeze([totalCalculator, shareCalculator, movementCalculator]);
export const contributorTagUsageMetricDefinitions = Object.freeze({ taggedPostedExpenseTotal, taggedPostedExpenseSharePercent, taggedPostedExpenseMovementPercent });
export const contributorTagUsageMetricIds = Object.freeze(Object.values(contributorTagUsageMetricDefinitions).map(({ id }) => id));
