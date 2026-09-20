import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import { MetricId, MetricKey, MetricVersion } from '../../../shared/domain/analyticsMetric';
import { CalculateUserMetrics } from './calculateUserMetrics';
import { builtInMetricId, userMetricCalculators } from './financialMetricCalculators';
import type { UserMetricContext } from './userMetricContext';

const service = new CalculateUserMetrics(userMetricCalculators);
const facts = (...entries: Array<[UserMetricContext['currentPeriodFacts'][number]['type'], string]>) =>
  entries.map(([type, amount]) => ({ type, amount }));

function context(currentPeriodFacts: UserMetricContext['currentPeriodFacts'], comparisonPeriodFacts?: UserMetricContext['comparisonPeriodFacts']): UserMetricContext {
  return { currency: 'EUR', currentPeriodFacts, comparisonPeriodFacts };
}

function value(key: string, current: UserMetricContext['currentPeriodFacts'], previous?: UserMetricContext['comparisonPeriodFacts']) {
  return service.execute(context(current, previous), [builtInMetricId(key)])[0]?.value;
}

describe('financial user metric calculators', () => {
  it('sums exact income and expense totals, excluding transfers', () => {
    expect(value('income_total', facts(['income', '0.10'], ['income', '0.20'], ['transfer_in', '90']))).toMatchObject({ kind: 'MONEY', value: ExactDecimal.from('0.30'), currency: 'EUR' });
    expect(value('expense_total', facts(['expense', '12.35'], ['expense', '0.15'], ['transfer_out', '90']))).toMatchObject({ kind: 'MONEY', value: ExactDecimal.from('12.50'), currency: 'EUR' });
  });

  it('includes transfers in net balance flow with balance impact signs', () => {
    expect(value('net_balance_flow', facts(['income', '100.25'], ['expense', '20.10'], ['transfer_in', '30'], ['transfer_out', '10'])))
      .toMatchObject({ kind: 'MONEY', value: ExactDecimal.from('100.15'), currency: 'EUR' });
  });

  it.each([
    ['expense_change_percent', facts(['expense', '120']), facts(['expense', '100']), '20'],
    ['expense_change_percent', facts(['expense', '80']), facts(['expense', '100']), '-20'],
    ['net_balance_flow_change_percent', facts(['income', '150']), facts(['income', '100']), '50'],
    ['net_balance_flow_change_percent', facts(['income', '50']), facts(['income', '100']), '-50'],
    ['net_balance_flow_change_percent', facts(['income', '50']), facts(['income', '-100']), '-150'],
  ])('calculates percentage point change %s', (key, current, previous, expected) => {
    const result = value(key as string, current as UserMetricContext['currentPeriodFacts'], previous as UserMetricContext['comparisonPeriodFacts']);
    expect(result?.kind).toBe('RATIO');
    if (result?.kind === 'RATIO') expect(result.value.toString()).toBe(expected);
  });

  it('omits comparison metrics when prior facts are absent or zero', () => {
    expect(value('expense_change_percent', facts(['expense', '2']))).toBeUndefined();
    expect(value('expense_change_percent', facts(['expense', '2']), facts(['expense', '0']))).toBeUndefined();
  });

  it('selects, deduplicates, and orders requested metrics by their IDs', () => {
    const income = builtInMetricId('income_total');
    const expense = builtInMetricId('expense_total');
    expect(service.execute(context(facts(['income', '2'], ['expense', '3'])), [expense, income, expense])
      .map((result) => result.definition.id.toString())).toEqual(['expense_total:v1', 'income_total:v1']);
  });

  it('fails clearly when a requested metric has no calculator', () => {
    const unsupported = MetricId.create(MetricKey.create('custom_metric'), MetricVersion.create(1));
    expect(() => service.execute(context([]), [unsupported])).toThrow('Unsupported user metric: custom_metric:v1');
  });
});
