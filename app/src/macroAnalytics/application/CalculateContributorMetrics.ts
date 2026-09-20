import type { ContributorMetricCalculator, ContributorMetricCalculationInput, ContributorMetricResult } from '../domain/contributorMetric';
import { createContributorMetricResult } from '../domain/contributorMetric';

export class CalculateContributorMetrics {
  private readonly calculatorsById: ReadonlyMap<string, ContributorMetricCalculator>;

  constructor(calculators: readonly ContributorMetricCalculator[]) {
    this.calculatorsById = new Map(calculators.map((calculator) => [calculator.definition.id.toString(), calculator]));
  }

  execute(input: ContributorMetricCalculationInput): readonly ContributorMetricResult[] {
    const requested = [...new Map(input.metricIds.map((id) => [id.toString(), id])).keys()];
    return Object.freeze(requested.flatMap((metricId) => {
      const calculator = this.calculatorsById.get(metricId);
      if (!calculator) throw new Error(`Unsupported contributor metric: ${metricId}`);
      const value = calculator.calculate(input.contribution, input.currency);
      return value === null ? [] : [createContributorMetricResult(
        input.contributorId,
        input.contribution.period,
        calculator.definition,
        value,
      )];
    }));
  }
}
