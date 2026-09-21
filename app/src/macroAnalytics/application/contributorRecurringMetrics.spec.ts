import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { contributorRecurringMetricCalculators, contributorRecurringMetricDefinitions } from './contributorRecurringMetrics';

const period = createAnalyticsPeriod('2026-09');
const base = {
  period,
  dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
  financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '0.40', count: 2 }] }] },
};

const contributionV3: MacroAnalyticsContribution = {
  ...base, schemaVersion: 3, categories: { currencies: [] },
  recurring: { currencies: [{ currency: 'EUR', buckets: [
    { source: 'POSTED', kind: 'EXPENSE', amount: '0.123', occurrenceCount: 1, seriesCount: 1 },
    { source: 'EXPECTED', kind: 'EXPENSE', amount: '0.2', occurrenceCount: 1, seriesCount: 1 },
    { source: 'SCHEDULED', kind: 'EXPENSE', amount: '0.1', occurrenceCount: 1, seriesCount: 1 },
  ] }] },
};
const contributionV4: MacroAnalyticsContribution = {
  ...contributionV3,
  schemaVersion: 4,
  sharing: { currencies: [] },
};

function values(contribution: MacroAnalyticsContribution, currency = 'EUR') {
  return new Map(contributorRecurringMetricCalculators.map((calculator) => [calculator.definition.id.toString(), calculator.calculate(contribution, currency)]));
}

describe('contributor recurring metrics', () => {
  it('calculates posted, expected, scheduled expense totals and posted share exactly', () => {
    const result = values(contributionV3);
    const posted = result.get(contributorRecurringMetricDefinitions.recurringPostedExpenseTotal.id.toString());
    expect(posted?.kind === 'MONEY' && posted.value.toString()).toBe('0.123');
    const expected = result.get(contributorRecurringMetricDefinitions.recurringExpectedExpenseTotal.id.toString());
    expect(expected?.kind === 'MONEY' && expected.value.toString()).toBe('0.2');
    const scheduled = result.get(contributorRecurringMetricDefinitions.recurringScheduledExpenseTotal.id.toString());
    expect(scheduled?.kind === 'MONEY' && scheduled.value.toString()).toBe('0.1');
    const ratio = result.get(contributorRecurringMetricDefinitions.recurringPostedExpenseSharePercent.id.toString());
    expect(ratio?.kind === 'RATIO' && ratio.value.toFixed(2)).toBe('30.75');
  });

  it('returns zero for missing recurring buckets, and null for V1, V2, or unavailable currency', () => {
    const noRecurring: MacroAnalyticsContribution = { ...base, schemaVersion: 3, categories: { currencies: [] }, recurring: { currencies: [] } };
    const noActivity = values(noRecurring);
    expect(noActivity.get('recurring_posted_expense_total:v1')).toMatchObject({ kind: 'MONEY' });
    expect((noActivity.get('recurring_posted_expense_total:v1') as { value: { toString(): string } }).value.toString()).toBe('0');
    expect(noActivity.get('recurring_posted_expense_share_percent:v1')).toMatchObject({ kind: 'RATIO' });
    const zeroPostedFinancial: MacroAnalyticsContribution = {
      ...noRecurring,
      financial: { currencies: [{ currency: 'EUR', buckets: [] }] },
    };
    expect(values(zeroPostedFinancial).get('recurring_posted_expense_share_percent:v1')).toBeNull();
    expect(values({ ...base, schemaVersion: 1 }).get('recurring_posted_expense_total:v1')).toBeNull();
    expect(values({ ...base, schemaVersion: 2, categories: { currencies: [] } }).get('recurring_posted_expense_total:v1')).toBeNull();
    expect(values(contributionV3, 'USD').get('recurring_posted_expense_total:v1')).toBeNull();
  });

  it('keeps recurring metrics available on V4 contributions', () => {
    expect(values(contributionV4).get('recurring_posted_expense_total:v1')).toMatchObject({ kind: 'MONEY' });
    expect((values(contributionV4).get('recurring_posted_expense_total:v1') as { value: { toString(): string } }).value.toString()).toBe('0.123');
  });
});
