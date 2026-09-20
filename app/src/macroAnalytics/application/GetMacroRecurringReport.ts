import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { Cohort } from '../domain/cohort';
import type { MacroRecurringReport } from '../domain/macroRecurringReport';
import type { ProcessedContributionSourcePort } from './ProcessedContributionSourcePort';
import type { CalculateContributorMetrics } from './CalculateContributorMetrics';
import type { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorRecurringMetricDefinitions } from './contributorRecurringMetrics';
import { cohortRecurringMetricDefinitions } from './cohortRecurringMetrics';

export type GetMacroRecurringReportInput = Readonly<{ period: AnalyticsPeriod; currency: string; cohort: Cohort }>;

export class GetMacroRecurringReport {
  constructor(
    private readonly contributions: ProcessedContributionSourcePort,
    private readonly contributorMetrics: CalculateContributorMetrics,
    private readonly cohortMetrics: CalculateCohortMetrics,
  ) {}

  async execute({ period, currency, cohort }: GetMacroRecurringReportInput): Promise<MacroRecurringReport> {
    const normalizedCurrency = currency.trim().toUpperCase();
    const processed = await this.contributions.list({ period, cohort });
    const contributors = processed.flatMap(({ contributorId, contribution }) => this.contributorMetrics.execute({
      contributorId,
      contribution,
      currency: normalizedCurrency,
      metricIds: Object.values(contributorRecurringMetricDefinitions).map(({ id }) => id),
    }).map((result) => ({ result, dimensions: contribution.dimensions, contribution })));
    const cohortResults = this.cohortMetrics.execute({
      period,
      cohort,
      currency: normalizedCurrency,
      metricIds: Object.values(cohortRecurringMetricDefinitions).map(({ id }) => id),
    }, contributors);
    const resultFor = (key: string) => cohortResults.find(({ definition }) => definition.id.toString() === `${key}:v1`);
    return Object.freeze({
      period,
      currency: normalizedCurrency,
      cohort,
      contributorCount: resultFor('median_recurring_posted_expense')?.contributorCount ?? 0,
      medianPostedRecurringExpense: resultFor('median_recurring_posted_expense')?.value ?? null,
      medianExpectedRecurringExpense: resultFor('median_recurring_expected_expense')?.value ?? null,
      medianScheduledRecurringExpense: resultFor('median_recurring_scheduled_expense')?.value ?? null,
      medianPostedRecurringExpenseSharePercent: resultFor('median_recurring_posted_expense_share_percent')?.value ?? null,
    });
  }
}
