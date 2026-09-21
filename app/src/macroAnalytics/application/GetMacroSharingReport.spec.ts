import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { GetMacroSharingReport } from './GetMacroSharingReport';
import { contributorFinancialMetricCalculators } from './contributorFinancialMetrics';
import { contributorSharingMetricCalculators } from './contributorSharingMetrics';
import { cohortSharingMetricCalculators } from './cohortSharingMetrics';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function sharedContribution(personal: string): MacroAnalyticsContribution {
  return {
    schemaVersion: 4, period, dimensions,
    financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '20', count: 1 }] }] },
    categories: { currencies: [] }, recurring: { currencies: [] },
    sharing: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '20', personalAmount: personal, participantAllocatedAmount: String(20 - Number(personal)), settlementRequiredAmount: String(20 - Number(personal)), movementCount: 1, participantCount: 2, settlementParticipantCount: 1 }] }] },
  };
}

describe('GetMacroSharingReport', () => {
  it('composes cohort metrics from processed contributions and exposes no sharing identities', async () => {
    const processed = {
      list: async () => [
        { contributorId: createAnalyticsContributorId('one'), contribution: sharedContribution('15') },
        { contributorId: createAnalyticsContributorId('two'), contribution: sharedContribution('5') },
      ],
    };
    const report = await new GetMacroSharingReport(
      processed,
      new CalculateContributorMetrics([...contributorFinancialMetricCalculators, ...contributorSharingMetricCalculators]),
      new CalculateCohortMetrics(cohortSharingMetricCalculators),
    ).execute({ period, currency: 'eur', cohort: createCohort({ countryCode: 'ES' }) });

    expect(report).toMatchObject({ period, currency: 'EUR', contributorCount: 2 });
    expect(report.medianSharedPostedPersonalExpense?.kind === 'MONEY' && report.medianSharedPostedPersonalExpense.value.toString()).toBe('10');
    expect(report.sharedPostedExpenseContributorPercent?.kind === 'RATIO' && report.sharedPostedExpenseContributorPercent.value.toString()).toBe('100');
    expect(JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value)).not.toMatch(/personId|participantId|displayName|payer|group|shareId|expectedMovementId/);
  });
});
