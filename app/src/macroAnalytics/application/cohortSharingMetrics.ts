import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { defineMetric, moneyMetricValue, ratioMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { CohortMetricCalculator } from '../domain/cohortMetric';
import { exactMedian } from '../domain/decimalStatistics';
import { hasSharingContribution } from '../domain/contributionCapabilities';
import { findSharingContributionBucket } from '../domain/sharingContribution';

function definition(key: string, kind: MetricDefinition['valueKind']): MetricDefinition {
  return defineMetric({ key, valueKind: kind });
}

export const medianSharedPostedPersonalExpense = definition('median_shared_posted_personal_expense', 'MONEY');
export const medianSharedPostedSettlementRequired = definition('median_shared_posted_settlement_required', 'MONEY');
export const medianSharedPostedExpenseSharePercent = definition('median_shared_posted_expense_share_percent', 'RATIO');
export const sharedPostedExpenseContributorPercent = definition('shared_posted_expense_contributor_percent', 'RATIO');

function medianCalculator(definition: MetricDefinition, contributorMetricId: string): CohortMetricCalculator {
  return Object.freeze({
    definition,
    contributorMetricId,
    calculate({ contributors, currency }) {
      const eligible = contributors.map(({ result }) => result.value)
        .filter((value): value is Extract<MetricValue, { kind: 'MONEY' | 'RATIO' }> => value.kind === definition.valueKind
          && (value.kind !== 'MONEY' || value.currency === currency));
      const median = exactMedian(eligible.map(({ value }) => value));
      if (!median) return null;
      return Object.freeze({
        value: definition.valueKind === 'MONEY' ? moneyMetricValue(median, currency) : ratioMetricValue(median),
        contributorCount: eligible.length,
      });
    },
  });
}

const sharingAdoptionCalculator: CohortMetricCalculator = Object.freeze({
  definition: sharedPostedExpenseContributorPercent,
  calculate({ contributions, currency }) {
    const eligible = contributions.filter((contribution) => hasSharingContribution(contribution)
      && contribution.financial.currencies.some(({ currency: entry }) => entry === currency));
    if (eligible.length === 0) return null;
    const active = eligible.filter((contribution) => hasSharingContribution(contribution)
      && (findSharingContributionBucket(contribution.sharing, currency, 'POSTED', 'EXPENSE')?.movementCount ?? 0) > 0).length;
    return Object.freeze({
      value: ratioMetricValue(ExactDecimal.from(String(active)).ratioTo(ExactDecimal.from(String(eligible.length)), 4).multiplyByInteger(100)),
      contributorCount: eligible.length,
    });
  },
});

export const cohortSharingMetricCalculators: readonly CohortMetricCalculator[] = Object.freeze([
  medianCalculator(medianSharedPostedPersonalExpense, 'shared_posted_personal_expense_total:v1'),
  medianCalculator(medianSharedPostedSettlementRequired, 'shared_posted_settlement_required_total:v1'),
  medianCalculator(medianSharedPostedExpenseSharePercent, 'shared_posted_expense_share_percent:v1'),
  sharingAdoptionCalculator,
]);

export const cohortSharingMetricDefinitions = Object.freeze({
  medianSharedPostedPersonalExpense,
  medianSharedPostedSettlementRequired,
  medianSharedPostedExpenseSharePercent,
  sharedPostedExpenseContributorPercent,
});
