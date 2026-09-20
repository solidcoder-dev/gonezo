import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { GetMacroRecurringReport } from './GetMacroRecurringReport';
import { cohortRecurringMetricCalculators } from './cohortRecurringMetrics';
import { contributorRecurringMetricCalculators } from './contributorRecurringMetrics';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function contribution(schemaVersion: 1 | 2 | 3, amount = '0') : MacroAnalyticsContribution {
  const base = { period, dimensions, financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '100', count: 1 }] }] } };
  if (schemaVersion === 1) return { ...base, schemaVersion };
  if (schemaVersion === 2) return { ...base, schemaVersion: 2, categories: { currencies: [] } };
  return {
    ...base,
    schemaVersion: 3,
    categories: { currencies: [] },
    recurring: { currencies: amount === '0' ? [] : [{ currency: 'EUR', buckets: [{ source: 'SCHEDULED', kind: 'EXPENSE', amount, occurrenceCount: 1, seriesCount: 1 }] }] },
  };
}

describe('GetMacroRecurringReport', () => {
  it('composes recurring cohort metrics and includes eligible zero recurring contributors', async () => {
    const entries = [
      { contributorId: createAnalyticsContributorId('one'), contribution: contribution(3, '20') },
      { contributorId: createAnalyticsContributorId('zero'), contribution: contribution(3, '0') },
      { contributorId: createAnalyticsContributorId('legacy'), contribution: contribution(2, '40') },
    ];
    const report = await new GetMacroRecurringReport(
      { list: async () => entries },
      new CalculateContributorMetrics(contributorRecurringMetricCalculators),
      new CalculateCohortMetrics(cohortRecurringMetricCalculators),
    ).execute({ period, currency: 'eur', cohort: createCohort({ countryCode: 'ES' }) });
    expect(report).toMatchObject({ period, currency: 'EUR', contributorCount: 2 });
    expect(report.medianScheduledRecurringExpense?.kind === 'MONEY' && report.medianScheduledRecurringExpense.value.toString()).toBe('10');
    expect('contributorId' in report).toBe(false);
  });
});
