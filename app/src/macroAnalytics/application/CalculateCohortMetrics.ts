import type { ContributorMetricResult } from '../domain/contributorMetric';
import type { CohortMetricCalculator, CohortMetricRequest, CohortMetricResult } from '../domain/cohortMetric';
import type { ContributionDimensions } from '../domain/contributionDimensions';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';

export type ContributorMetricWithDimensions = Readonly<{ result: ContributorMetricResult; dimensions: ContributionDimensions; contribution?: MacroAnalyticsContribution }>;

export class CalculateCohortMetrics {
  private readonly calculatorsById: ReadonlyMap<string, CohortMetricCalculator>;

  constructor(calculators: readonly CohortMetricCalculator[]) {
    this.calculatorsById = new Map(calculators.map((calculator) => [calculator.definition.id.toString(), calculator]));
  }

  execute(request: CohortMetricRequest, contributors: readonly ContributorMetricWithDimensions[]): readonly CohortMetricResult[] {
    const requested = [...new Set(request.metricIds.map((id) => id.toString()))];
    return Object.freeze(requested.flatMap((id) => {
      const calculator = this.calculatorsById.get(id);
      if (!calculator) throw new Error(`Unsupported cohort metric: ${id}`);
      const matchingContributors = contributors.filter(({ result, dimensions }) => result.period.value === request.period.value
        && request.cohort.includes(dimensions));
      const contributorResults = new Map(matchingContributors
        .filter(({ result }) => !calculator.contributorMetricId || result.definition.id.toString() === calculator.contributorMetricId)
        .map(({ result, dimensions }) => [`${result.contributorId}:${result.definition.id.toString()}`, { result, dimensions }]));
      const matchingContributions = new Map(matchingContributors
        .filter(({ contribution }) => contribution?.period.value === request.period.value)
        .map(({ result, contribution }) => [result.contributorId, contribution!]));
      const calculated = calculator.calculate({
        contributors: [...contributorResults.values()],
        contributions: [...matchingContributions.values()],
        currency: request.currency,
      });
      return calculated ? [Object.freeze({ period: request.period, cohort: request.cohort, definition: calculator.definition, ...calculated })] : [];
    }));
  }

}
