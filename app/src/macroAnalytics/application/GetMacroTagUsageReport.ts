import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { Cohort } from '../domain/cohort';
import type { MacroTagUsageReport } from '../domain/macroTagUsageReport';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';
import type { CalculateContributorMetrics } from './CalculateContributorMetrics';
import type { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorTagUsageMetricIds } from './contributorTagUsageMetrics';
import { cohortTagUsageMetricDefinitions, cohortTagUsageMetricIds } from './cohortTagUsageMetrics';

export type GetMacroTagUsageReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroTagUsageReport {
  private readonly contributions: ProcessedContributionSourcePort;
  private readonly contributorMetrics: CalculateContributorMetrics;
  private readonly cohortMetrics: CalculateCohortMetrics;

  constructor(
    contributions: ProcessedContributionSourcePort,
    contributorMetrics: CalculateContributorMetrics,
    cohortMetrics: CalculateCohortMetrics,
  ) {
    this.contributions = contributions;
    this.contributorMetrics = contributorMetrics;
    this.cohortMetrics = cohortMetrics;
  }

  async execute({ period, currency, cohort }: GetMacroTagUsageReportInput): Promise<MacroTagUsageReport> {
    const normalizedCurrency = currency.trim().toUpperCase();
    const processed = await this.contributions.list({ period, cohort });
    const contributors = processed.flatMap(({ contributorId, contribution }) => this.contributorMetrics.execute({
      contributorId, contribution, currency: normalizedCurrency, metricIds: contributorTagUsageMetricIds,
    }).map((result) => ({ result, dimensions: contribution.dimensions, contribution })));
    const results = this.cohortMetrics.execute({ period, cohort, currency: normalizedCurrency, metricIds: cohortTagUsageMetricIds }, contributors);
    const valueFor = (definition: { id: { toString(): string } }) => results.find(({ definition: resultDefinition }) => resultDefinition.id.toString() === definition.id.toString());
    const eligible = valueFor(cohortTagUsageMetricDefinitions.taggedPostedExpenseContributorPercent);
    return Object.freeze({
      period, currency: normalizedCurrency, cohort,
      eligibleContributorCount: eligible?.contributorCount ?? 0,
      medianTaggedPostedExpense: valueFor(cohortTagUsageMetricDefinitions.medianTaggedPostedExpense)?.value ?? null,
      medianTaggedPostedExpenseSharePercent: valueFor(cohortTagUsageMetricDefinitions.medianTaggedPostedExpenseSharePercent)?.value ?? null,
      medianTaggedPostedExpenseMovementPercent: valueFor(cohortTagUsageMetricDefinitions.medianTaggedPostedExpenseMovementPercent)?.value ?? null,
      taggedPostedExpenseContributorPercent: eligible?.value ?? null,
    });
  }
}
