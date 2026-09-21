import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import { hasBalanceContribution } from '../domain/contributionCapabilities';
import { buildCohortAccountTypeBreakdown } from '../domain/cohortAccountTypeBreakdown';
import type { Cohort } from '../domain/cohort';
import type { MacroBalanceReport } from '../domain/macroBalanceReport';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorBalanceMetricCalculators, contributorBalanceMetricDefinitions } from './contributorBalanceMetrics';
import { cohortBalanceMetricCalculators, cohortBalanceMetricDefinitions } from './cohortBalanceMetrics';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';

export type GetMacroBalanceReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroBalanceReport {
  private readonly contributions: ProcessedContributionSourcePort;
  private readonly contributorMetrics = new CalculateContributorMetrics(contributorBalanceMetricCalculators);
  private readonly cohortMetrics = new CalculateCohortMetrics(cohortBalanceMetricCalculators);

  constructor(contributions: ProcessedContributionSourcePort) { this.contributions = contributions; }

  async execute({ period, currency, cohort }: GetMacroBalanceReportInput): Promise<MacroBalanceReport> {
    const processed = await this.contributions.list({ period, cohort });
    const normalizedCurrency = currency.trim().toUpperCase();
    const eligible = processed.filter(({ contribution }) => hasBalanceContribution(contribution)
      && contribution.period.value === period.value
      && contribution.balances.currencies.some((item) => item.currency === normalizedCurrency));
    const metricIds = [contributorBalanceMetricDefinitions.periodEndAccountBalance, contributorBalanceMetricDefinitions.accountCount].map(({ id }) => id);
    const results = eligible.flatMap(({ contributorId, contribution }) => this.contributorMetrics.execute({ contributorId, contribution, currency: normalizedCurrency, metricIds })
      .map((result) => ({ result, dimensions: contribution.dimensions, contribution })));
    const cohortResults = this.cohortMetrics.execute({
      period, cohort, currency: normalizedCurrency,
      metricIds: [cohortBalanceMetricDefinitions.medianPeriodEndAccountBalance, cohortBalanceMetricDefinitions.totalAccountCount].map(({ id }) => id),
    }, results);
    const metric = (definitionId: string) => cohortResults.find(({ definition }) => definition.id.toString() === definitionId)?.value ?? null;
    const breakdown = buildCohortAccountTypeBreakdown({ period, currency: normalizedCurrency, cohort, contributions: eligible.map(({ contribution }) => contribution) });
    return Object.freeze({
      period,
      currency: normalizedCurrency,
      cohort,
      eligibleContributorCount: eligible.length,
      medianPeriodEndAccountBalance: metric(cohortBalanceMetricDefinitions.medianPeriodEndAccountBalance.id.toString()),
      totalAccountCount: metric(cohortBalanceMetricDefinitions.totalAccountCount.id.toString()),
      accountTypes: breakdown.items,
    });
  }
}
