import type { ContributorMetricResult } from '../domain/contributorMetric';
import type { CohortMetricCalculator, CohortMetricRequest, CohortMetricResult } from '../domain/cohortMetric';
import type { ContributionDimensions } from '../domain/contributionDimensions';

export type ContributorMetricWithDimensions = Readonly<{ result: ContributorMetricResult; dimensions: ContributionDimensions }>;

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
      const contributorValues = contributors.filter(({ result, dimensions }) => result.period.value === request.period.value
        && request.cohort.includes(dimensions)
        && result.value.kind === 'MONEY'
        && result.value.currency === request.currency
        && calculator.contributorMetricId === result.definition.id.toString());
      const uniqueContributors = new Map(contributorValues.map(({ result }) => [result.contributorId, result.value]));
      const calculated = calculator.calculate([...uniqueContributors.values()], request.currency);
      return calculated ? [Object.freeze({ period: request.period, cohort: request.cohort, definition: calculator.definition, ...calculated })] : [];
    }));
  }

}
