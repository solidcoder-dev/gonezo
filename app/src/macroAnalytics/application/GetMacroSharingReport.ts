import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { Cohort } from '../domain/cohort';
import type { MacroSharingReport } from '../domain/macroSharingReport';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';
import type { CalculateContributorMetrics } from './CalculateContributorMetrics';
import type { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorSharingMetricDefinitions } from './contributorSharingMetrics';
import { cohortSharingMetricDefinitions } from './cohortSharingMetrics';
import { postedExpenseTotal } from './contributorFinancialMetrics';

export type GetMacroSharingReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroSharingReport {
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

  async execute({ period, currency, cohort }: GetMacroSharingReportInput): Promise<MacroSharingReport> {
    const normalizedCurrency = currency.trim().toUpperCase();
    const processed = await this.contributions.list({ period, cohort });
    const contributors = processed.flatMap(({ contributorId, contribution }) => this.contributorMetrics.execute({
      contributorId,
      contribution,
      currency: normalizedCurrency,
      metricIds: [...Object.values(contributorSharingMetricDefinitions), postedExpenseTotal].map(({ id }) => id),
    }).map((result) => ({ result, dimensions: contribution.dimensions, contribution })));
    const results = this.cohortMetrics.execute({
      period,
      cohort,
      currency: normalizedCurrency,
      metricIds: Object.values(cohortSharingMetricDefinitions).map(({ id }) => id),
    }, contributors);
    const resultFor = (key: string) => results.find(({ definition }) => definition.id.toString() === `${key}:v1`);
    return Object.freeze({
      period, currency: normalizedCurrency, cohort,
      contributorCount: resultFor('median_shared_posted_personal_expense')?.contributorCount
        ?? resultFor('shared_posted_expense_contributor_percent')?.contributorCount ?? 0,
      medianSharedPostedPersonalExpense: resultFor('median_shared_posted_personal_expense')?.value ?? null,
      medianSharedPostedSettlementRequired: resultFor('median_shared_posted_settlement_required')?.value ?? null,
      medianSharedPostedExpenseSharePercent: resultFor('median_shared_posted_expense_share_percent')?.value ?? null,
      sharedPostedExpenseContributorPercent: resultFor('shared_posted_expense_contributor_percent')?.value ?? null,
    });
  }
}
