import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { Cohort } from '../domain/cohort';
import type { MacroOverviewReport } from '../domain/macroOverviewReport';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorFinancialMetricDefinitions } from './contributorFinancialMetrics';
import { cohortFinancialMetricDefinitions } from './cohortFinancialMetrics';

export type GetMacroOverviewReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroOverviewReport {
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

  async execute({ period, currency, cohort }: GetMacroOverviewReportInput): Promise<MacroOverviewReport> {
    const normalizedCurrency = currency.trim().toUpperCase();
    const processed = await this.contributions.list({ period, cohort });
    const metricIds = Object.values(contributorFinancialMetricDefinitions).map(({ id }) => id);
    const contributors = processed.flatMap(({ contributorId, contribution }) => this.contributorMetrics.execute({
      contributorId, contribution, currency: normalizedCurrency, metricIds,
    }).map((result) => ({ result, dimensions: contribution.dimensions })));
    const cohortResults = this.cohortMetrics.execute({
      period,
      cohort,
      currency: normalizedCurrency,
      metricIds: Object.values(cohortFinancialMetricDefinitions).map(({ id }) => id),
    }, contributors);
    const valueFor = (key: string) => cohortResults.find(({ definition }) => definition.id.toString() === `${key}:v1`)?.value ?? null;
    return Object.freeze({
      period,
      currency: normalizedCurrency,
      cohort,
      contributorCount: cohortResults[0]?.contributorCount ?? 0,
      medianPostedIncome: valueFor('median_posted_income'),
      medianPostedExpense: valueFor('median_posted_expense'),
      medianExpectedExpense: valueFor('median_expected_expense'),
      medianScheduledExpense: valueFor('median_scheduled_expense'),
    });
  }
}
