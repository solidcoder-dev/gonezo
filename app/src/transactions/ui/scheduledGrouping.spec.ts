import { describe, expect, it } from 'vitest';
import type { ScheduledMovementView } from '../../movements/domain/movementsView.types';
import { groupScheduledMovementsByDate } from './scheduledGrouping';

function scheduled(
  input: Partial<ScheduledMovementView> & Pick<ScheduledMovementView, 'id' | 'startAt'>,
): ScheduledMovementView {
  return {
    id: input.id,
    type: input.type ?? 'expense',
    sourceAccountId: input.sourceAccountId ?? 'acc-1',
    targetAccountId: input.targetAccountId,
    amount: input.amount ?? '1.00',
    currency: input.currency ?? 'USD',
    destinationAmount: input.destinationAmount,
    destinationCurrency: input.destinationCurrency,
    exchangeRate: input.exchangeRate,
    description: input.description,
    merchant: input.merchant,
    status: input.status ?? 'active',
    startAt: input.startAt,
    nextDueAt: input.nextDueAt,
    zoneId: input.zoneId ?? 'UTC',
    generatedOccurrences: input.generatedOccurrences ?? 0,
    splitItems: input.splitItems ?? [],
    rule: input.rule ?? { frequency: 'daily', interval: 1 },
    recurrenceEnd: input.recurrenceEnd ?? { kind: 'never' },
    categoryId: input.categoryId,
    tagIds: input.tagIds,
    tagNames: input.tagNames,
    scheduleKind: input.scheduleKind,
    origin: input.origin,
  };
}

describe('scheduledGrouping', () => {
  it('groups upcoming movements by local day and sorts each group by due date asc', () => {
    const now = new Date('2026-04-12T12:00:00.000Z');
    const input = [
      scheduled({ id: 'sc-3', startAt: '2026-04-13T12:00:00.000Z', nextDueAt: '2026-04-13T12:00:00.000Z' }),
      scheduled({ id: 'sc-2', startAt: '2026-04-12T10:00:00.000Z', nextDueAt: '2026-04-12T10:00:00.000Z' }),
      scheduled({ id: 'sc-1', startAt: '2026-04-12T08:00:00.000Z', nextDueAt: '2026-04-12T08:00:00.000Z' }),
    ];

    const grouped = groupScheduledMovementsByDate(input, now);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].label).toBe('Today');
    expect(grouped[0].items.map((item) => item.id)).toEqual(['sc-1', 'sc-2']);
    expect(grouped[1].items.map((item) => item.id)).toEqual(['sc-3']);
  });

  it('falls back to startAt when nextDueAt is missing', () => {
    const now = new Date('2026-04-12T12:00:00.000Z');
    const input = [
      scheduled({ id: 'sc-1', startAt: '2026-04-14T09:00:00.000Z' }),
    ];

    const grouped = groupScheduledMovementsByDate(input, now);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].items[0].id).toBe('sc-1');
  });
});
