import { describe, expect, it } from 'vitest';
import { ExactDecimal } from './exactDecimal';
import { MetricId, MetricKey, MetricVersion, countMetricValue, createMetricDefinition, moneyMetricValue, ratioMetricValue } from './analyticsMetric';

describe('analytics metric primitives', () => {
  it('keeps key and version as typed parts of metric identity', () => {
    const id = MetricId.create(MetricKey.create('expense_total'), MetricVersion.create(1));
    expect(id.toString()).toBe('expense_total:v1');
    expect(createMetricDefinition(id, 'MONEY')).toEqual({ id, valueKind: 'MONEY' });
    expect(Object.isFrozen(id)).toBe(true);
    expect(() => MetricKey.create('Expense Total')).toThrow();
    expect(() => MetricVersion.create(0)).toThrow();
  });

  it('represents only money, ratio and count values', () => {
    expect(moneyMetricValue(ExactDecimal.from('2.50'), 'eur')).toMatchObject({ kind: 'MONEY', currency: 'EUR' });
    expect(ratioMetricValue(ExactDecimal.from('0.25')).kind).toBe('RATIO');
    expect(countMetricValue(2)).toEqual({ kind: 'COUNT', value: 2 });
  });
});
