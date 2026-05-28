import { describe, expect, it } from 'vitest';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import { filterProjectedScheduledMovements } from './monthlyMovementProjection';

function scheduledMovement(id: string): SchedulingMovementItem {
  return {
    id,
    type: 'expense',
    sourceAccountId: 'account-1',
    amount: '25.00',
    currency: 'EUR',
    description: 'Internet',
    merchant: 'Provider',
    status: 'active',
    startAt: '2026-05-10T00:00:00.000Z',
    nextDueAt: '2026-05-10T00:00:00.000Z',
    zoneId: 'Atlantic/Canary',
    generatedOccurrences: 0,
    splitItems: [],
    rule: {
      frequency: 'monthly',
      interval: 1,
    },
    recurrenceEnd: {
      kind: 'never',
    },
  };
}

function expectedMovement(originOccurrenceId?: string): ExpectedMovementItem {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    type: 'expense',
    amount: '25.00',
    currency: 'EUR',
    expectedAt: '2026-05-10T00:00:00.000Z',
    description: 'Internet',
    merchant: 'Provider',
    categoryId: undefined,
    originOccurrenceId,
    splitItems: [],
    status: 'pending',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

describe('monthlyMovementProjection', () => {
  it('removes scheduled projections already represented by an expected occurrence', () => {
    const scheduled = scheduledMovement('scheduled-1');

    expect(filterProjectedScheduledMovements([scheduled], [expectedMovement('scheduled-1')])).toEqual([]);
  });

  it('keeps equal-looking movements when there is no explicit occurrence relation', () => {
    const scheduled = scheduledMovement('scheduled-1');

    expect(filterProjectedScheduledMovements([scheduled], [expectedMovement()])).toEqual([scheduled]);
  });

  it('does not show inactive scheduled movements', () => {
    const scheduled = {
      ...scheduledMovement('scheduled-1'),
      status: 'deactivated' as const,
    };

    expect(filterProjectedScheduledMovements([scheduled], [])).toEqual([]);
  });
});
