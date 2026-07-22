import { describe, expect, it } from 'vitest';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';
import {
  mapExpectedMovementView,
  mapMovementDetailViewModel,
  normalizeExpectedMovementOrigin,
} from './movementDetailMappers';
import type { ScheduledMovementView } from './movementsView.types';

function expected(overrides: Partial<ExpectedMovementItem> = {}): ExpectedMovementItem {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    type: 'expense',
    amount: '20.00',
    currency: 'EUR',
    expectedAt: '2026-07-20T00:00:00.000Z',
    splitItems: [],
    status: 'pending',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function scheduled(status: ScheduledMovementView['status'] = 'active'): ScheduledMovementView {
  return {
    id: 'series-1',
    type: 'expense',
    sourceAccountId: 'account-1',
    amount: '20.00',
    currency: 'EUR',
    status,
    startAt: '2026-07-01T00:00:00.000Z',
    nextDueAt: '2026-08-01T00:00:00.000Z',
    zoneId: 'UTC',
    generatedOccurrences: 1,
    splitItems: [],
    rule: { frequency: 'monthly', interval: 1 },
    recurrenceEnd: { kind: 'never' },
  };
}

function detail(expectedItem: ExpectedMovementItem, scheduledItems: ScheduledMovementView[] = []) {
  const movement = mapExpectedMovementView(expectedItem);
  return mapMovementDetailViewModel({
    selection: { source: 'expected', id: movement.id },
    postedItems: [],
    scheduledItems,
    expectedSeriesState: { phase: 'loaded', recurringMovementId: 'series-1', series: scheduledItems[0] },
    expectedItems: [movement],
    categories: [],
    tags: [],
    sharing: { phase: 'idle' },
  });
}

describe('expected movement detail mapping', () => {
  it('normalizes manual, recurring and partial origins explicitly', () => {
    expect(normalizeExpectedMovementOrigin(expected())).toEqual({ kind: 'manual' });
    expect(normalizeExpectedMovementOrigin(expected({
      originOccurrenceId: 'occurrence-1',
      originRecurringMovementId: 'series-1',
    }))).toEqual({ kind: 'recurring', occurrenceId: 'occurrence-1', recurringMovementId: 'series-1' });
    expect(normalizeExpectedMovementOrigin(expected({ originOccurrenceId: 'occurrence-1' }))).toEqual({
      kind: 'recurring_unlinked',
      occurrenceId: 'occurrence-1',
      recurringMovementId: undefined,
    });
  });

  it('keeps manual expected details without a series projection', () => {
    expect(detail(expected())).toMatchObject({
      source: 'expected',
      originLabel: 'Manual',
      series: { kind: 'manual' },
    });
  });

  it.each([
    ['active', true],
    ['deactivated', false],
    ['completed', false],
  ] as const)('projects a %s series by recurring movement id', (status, canStopFutureMovements) => {
    const result = detail(expected({
      originOccurrenceId: 'occurrence-1',
      originRecurringMovementId: 'series-1',
    }), [scheduled(status)]);

    expect(result).toMatchObject({
      series: {
        kind: 'recurring',
        occurrenceId: 'occurrence-1',
        series: {
          id: 'series-1',
          status,
          scheduleSummary: 'Every month',
          nextDueLabel: 'Aug 1, 2026',
          canStopFutureMovements,
        },
      },
    });
  });

  it('keeps an unresolved recurring origin visible without a stop capability', () => {
    expect(detail(expected({
      originOccurrenceId: 'occurrence-1',
      originRecurringMovementId: 'missing-series',
    }))).toMatchObject({
      originLabel: 'Recurring',
      series: { kind: 'recurring', occurrenceId: 'occurrence-1', series: null },
    });
  });
});
