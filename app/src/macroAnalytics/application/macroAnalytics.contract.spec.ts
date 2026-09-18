import { describe, expect, it } from 'vitest';
import { MACRO_ANALYTICS_SCHEMA_VERSION, createFinancialFact } from './macroAnalytics.contract';

describe('Macro Analytics application contract', () => {
  it('exposes the current schema version and fact construction boundary', () => {
    expect(MACRO_ANALYTICS_SCHEMA_VERSION).toBe(1);
    expect(createFinancialFact({
      id: 'opaque-fact-id',
      occurredAt: '2026-09-18T10:30:00Z',
      source: 'SCHEDULED',
      kind: 'INCOME',
      amount: '10.01',
      currency: 'GBP',
    }).source).toBe('SCHEDULED');
  });
});
