import type { Cohort } from '../domain/cohort';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroCategoryReport } from '../domain/macroCategoryReport';
import { buildCohortCategoryBreakdown } from '../domain/cohortCategoryBreakdown';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';

export type GetMacroCategoryReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroCategoryReport {
  private readonly contributions: ProcessedContributionSourcePort;

  constructor(contributions: ProcessedContributionSourcePort) {
    this.contributions = contributions;
  }

  async execute({ period, currency, cohort }: GetMacroCategoryReportInput): Promise<MacroCategoryReport> {
    const processed = await this.contributions.list({ period, cohort });
    const cohortBreakdown = buildCohortCategoryBreakdown({
      period,
      currency,
      cohort,
      contributions: processed.map(({ contribution }) => contribution),
    });
    return Object.freeze({
      period: cohortBreakdown.period,
      currency: cohortBreakdown.currency,
      cohort: cohortBreakdown.cohort,
      eligibleContributorCount: cohortBreakdown.eligibleContributorCount,
      postedExpenseCategories: cohortBreakdown.items,
    });
  }
}
