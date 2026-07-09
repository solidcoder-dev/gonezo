import { describe, expect, it } from 'vitest';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import { buildOverviewRecurringInsight } from './overviewRecurringInsight';

function movement(
  input: Partial<SchedulingMovementItem> & Pick<SchedulingMovementItem, 'id' | 'type' | 'sourceAccountId' | 'amount' | 'currency' | 'status' | 'startAt' | 'zoneId' | 'generatedOccurrences' | 'splitItems' | 'rule' | 'recurrenceEnd'>,
): SchedulingMovementItem {
  return {
    ...input,
  };
}

describe('overviewRecurringInsight', () => {
  it('aggregates recurring movements in the selected overview window', () => {
    expect(buildOverviewRecurringInsight([
      movement({
        id: 'rec-1',
        type: 'expense',
        sourceAccountId: 'acc-1',
        amount: '95.90',
        currency: 'EUR',
        status: 'active',
        startAt: '2026-06-01T00:00:00.000Z',
        zoneId: 'Europe/Madrid',
        generatedOccurrences: 0,
        splitItems: [],
        rule: { frequency: 'monthly' },
        recurrenceEnd: { kind: 'never' },
      }),
      movement({
        id: 'rec-2',
        type: 'income',
        sourceAccountId: 'acc-1',
        amount: '50.00',
        currency: 'EUR',
        status: 'active',
        startAt: '2026-06-01T00:00:00.000Z',
        zoneId: 'Europe/Madrid',
        generatedOccurrences: 0,
        splitItems: [],
        rule: { frequency: 'monthly' },
        recurrenceEnd: { kind: 'never' },
      }),
    ])).toEqual({
      key: 'recurringImpact',
      title: 'Recurring impact',
      subtitle: '2 recurring',
      amount: '145.90',
    });
  });
});
