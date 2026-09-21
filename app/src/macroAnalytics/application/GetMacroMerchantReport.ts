import type { Cohort } from '../domain/cohort';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroMerchantReport } from '../domain/macroMerchantReport';
import { buildCohortMerchantRanking } from '../domain/cohortMerchantRanking';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';

export type GetMacroMerchantReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroMerchantReport {
  private readonly contributions: ProcessedContributionSourcePort;

  constructor(contributions: ProcessedContributionSourcePort) { this.contributions = contributions; }

  async execute({ period, currency, cohort }: GetMacroMerchantReportInput): Promise<MacroMerchantReport> {
    const processed = await this.contributions.list({ period, cohort });
    const ranking = buildCohortMerchantRanking({ period, currency, cohort, contributions: processed.map(({ contribution }) => contribution) });
    return Object.freeze({
      period: ranking.period,
      currency: ranking.currency,
      cohort: ranking.cohort,
      eligibleContributorCount: ranking.eligibleContributorCount,
      catalogVersion: ranking.catalogVersion,
      merchantCoveragePercent: ranking.merchantCoveragePercent,
      postedExpenseMerchants: ranking.items,
    });
  }
}
