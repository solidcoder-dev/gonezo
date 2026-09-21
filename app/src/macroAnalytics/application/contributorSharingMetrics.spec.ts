import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { contributorSharingMetricCalculators, contributorSharingMetricDefinitions } from './contributorSharingMetrics';
import type { MacroAnalyticsContribution, MacroAnalyticsContributionV4 } from '../domain/macroAnalyticsContribution';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function v4(currency = 'EUR'): MacroAnalyticsContributionV4 {
  return {
    schemaVersion: 4, period, dimensions,
    financial: { currencies: [{ currency, buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '20.00', count: 1 }] }] },
    categories: { currencies: [] }, recurring: { currencies: [] },
    sharing: { currencies: [{ currency, buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '20.00', personalAmount: '15.00', participantAllocatedAmount: '5.00', settlementRequiredAmount: '5.00', movementCount: 1, participantCount: 2, settlementParticipantCount: 1 }] }] },
  };
}

function v5(): MacroAnalyticsContribution {
  const contribution = v4();
  return { ...contribution, schemaVersion: 5, merchants: { catalogVersion: 1, currencies: [] } };
}

function results(contribution: MacroAnalyticsContribution, currency = 'EUR') {
  return new Map(new CalculateContributorMetrics(contributorSharingMetricCalculators).execute({
    contributorId: createAnalyticsContributorId('opaque-id'), contribution, currency,
    metricIds: Object.values(contributorSharingMetricDefinitions).map(({ id }) => id),
  }).map(({ definition, value }) => [definition.id.toString(), value]));
}

describe('contributor sharing metrics', () => {
  it('calculates personal, settlement-required, and percentage-point values exactly', () => {
    const values = results(v4());
    expect(values.get('shared_posted_personal_expense_total:v1')).toEqual({ kind: 'MONEY', value: ExactDecimal.from('15.00'), currency: 'EUR' });
    expect(values.get('shared_posted_settlement_required_total:v1')).toEqual({ kind: 'MONEY', value: ExactDecimal.from('5.00'), currency: 'EUR' });
    expect(values.get('shared_posted_expense_share_percent:v1')).toEqual({ kind: 'RATIO', value: ExactDecimal.from('75.0000') });
  });

  it('keeps V4 sharing metrics identical on V5 contributions', () => {
    expect(results(v5())).toEqual(results(v4()));
  });

  it('returns null for legacy schemas and missing currency, and zero for selected V4 with no sharing activity', () => {
    const legacy: MacroAnalyticsContribution = { schemaVersion: 3, period, dimensions, financial: { currencies: [{ currency: 'EUR', buckets: [] }] }, categories: { currencies: [] }, recurring: { currencies: [] } };
    expect(results(legacy).size).toBe(0);
    expect(results(v4(), 'USD').size).toBe(0);
    const inactive = { ...v4(), sharing: { currencies: [] } };
    expect(results(inactive).get('shared_posted_personal_expense_total:v1')).toEqual({ kind: 'MONEY', value: ExactDecimal.from('0'), currency: 'EUR' });
    expect(results(inactive).get('shared_posted_expense_share_percent:v1')).toEqual({ kind: 'RATIO', value: ExactDecimal.from('0.0000') });
    const noExpense = { ...v4(), financial: { currencies: [{ currency: 'EUR', buckets: [] }] } };
    expect(results(noExpense).has('shared_posted_expense_share_percent:v1')).toBe(false);
  });
});
