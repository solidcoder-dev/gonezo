import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, createMetricDefinition } from '../../shared/domain/analyticsMetric';
import { createUserMetricResult } from './userMetricResult';

describe('UserMetricResult', () => {
  it('requires the value kind to match its definition', () => {
    const id = MetricId.create(MetricKey.create('expense_total'), MetricVersion.create(1));

    expect(() => createUserMetricResult(
      createMetricDefinition(id, 'MONEY'),
      ratioMetricValue(ExactDecimal.from('1')),
    )).toThrow('Metric value kind RATIO does not match definition kind MONEY');
  });

  it('preserves a matching definition and value', () => {
    const id = MetricId.create(MetricKey.create('expense_total'), MetricVersion.create(1));
    const definition = createMetricDefinition(id, 'MONEY');
    const value = moneyMetricValue(ExactDecimal.from('1.25'), 'EUR');

    expect(createUserMetricResult(definition, value)).toEqual({ definition, value });
  });
});
