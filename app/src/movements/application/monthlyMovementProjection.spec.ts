import { describe, expect, it } from 'vitest';
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

describe('monthlyMovementProjection', () => {
  it('removes confirmation-required schedules because their occurrences belong in expected', () => {
    const scheduled = {
      ...scheduledMovement('scheduled-1'),
      reviewPolicy: 'require_user_confirmation' as const,
    };

    expect(filterProjectedScheduledMovements([scheduled])).toEqual([]);
  });

  it('keeps automatic schedules visible', () => {
    const scheduled = scheduledMovement('scheduled-1');

    expect(filterProjectedScheduledMovements([scheduled])).toEqual([scheduled]);
  });

  it('does not show inactive scheduled movements', () => {
    const scheduled = {
      ...scheduledMovement('scheduled-1'),
      status: 'deactivated' as const,
    };

    expect(filterProjectedScheduledMovements([scheduled])).toEqual([]);
  });
});
