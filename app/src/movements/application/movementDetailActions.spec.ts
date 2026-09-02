import { describe, expect, it } from 'vitest';
import type { ExpectedMovementItem } from '../../expected/application/expected.port';
import { buildMovementDetailActions } from './movementDetailActions';
import { mapExpectedMovementView, mapMovementDetailViewModel } from './movementDetailMappers';
import type { MovementDetailViewModel } from './movementDetailView.types';
import type { ScheduledMovementView } from './movementsView.types';

function scheduled(status: ScheduledMovementView['status'] = 'active'): ScheduledMovementView {
  return {
    id: 'series-1', type: 'expense', sourceAccountId: 'account-1', amount: '20.00', currency: 'EUR', status,
    startAt: '2026-07-01T00:00:00.000Z', nextDueAt: '2026-08-01T00:00:00.000Z', zoneId: 'UTC', generatedOccurrences: 1,
    splitItems: [], rule: { frequency: 'monthly', interval: 1 }, recurrenceEnd: { kind: 'never' },
  };
}

function expected(status: ExpectedMovementItem['status'] = 'pending', overrides: Partial<ExpectedMovementItem> = {}): ExpectedMovementItem {
  return {
    id: 'expected-1', accountId: 'account-1', type: 'expense', amount: '20.00', currency: 'EUR', expectedAt: '2026-07-20T00:00:00.000Z',
    splitItems: [], status, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z', ...overrides,
  };
}

function expectedDetail(item: ExpectedMovementItem, series: ScheduledMovementView | null = null): MovementDetailViewModel {
  const movement = mapExpectedMovementView(item);
  return mapMovementDetailViewModel({
    detail: {
      source: 'expected', movement,
      origin: movement.origin.kind === 'manual' ? { kind: 'manual' } : movement.origin.kind === 'recurring'
        ? { kind: 'recurring', recurringMovementId: movement.origin.recurringMovementId, occurrenceId: movement.origin.occurrenceId, series }
        : { kind: 'recurring_unlinked', occurrenceId: movement.origin.occurrenceId ?? '' },
    }, categories: [], tags: [], sharing: { phase: 'idle' },
  })!;
}

function actionIds(movement: MovementDetailViewModel) {
  return buildMovementDetailActions(movement).map((action) => action.id);
}

describe('movement detail action projection', () => {
  it.each([
    ['posted + posted', true, ['void-posted', 'duplicate-movement']], ['posted + voided', false, ['duplicate-movement']],
  ])('%s', (_, canVoid, expectedActions) => {
    const movement = { source: 'posted', id: 'tx-1', canVoid } as MovementDetailViewModel;
    expect(actionIds(movement)).toEqual(expectedActions);
  });

  it.each([
    ['active', ['stop-recurring-series', 'duplicate-movement']], ['inactive', ['duplicate-movement']], ['completed', ['duplicate-movement']],
  ])('scheduled + %s', (status, expectedActions) => {
    const movement = { source: 'scheduled', id: 'series-1', canStopFutureMovements: status === 'active' } as MovementDetailViewModel;
    expect(actionIds(movement)).toEqual(expectedActions);
  });

  it('expected manual movements can be duplicated regardless of lifecycle', () => {
    expect(actionIds(expectedDetail(expected('pending')))).toEqual(['edit-expected', 'dismiss-expected', 'duplicate-movement']);
    expect(actionIds(expectedDetail(expected('resolved')))).toEqual(['duplicate-movement']);
    expect(actionIds(expectedDetail(expected('dismissed')))).toEqual(['duplicate-movement']);
  });

  it('expected recurring pending adds stop only when its series is active', () => {
    const item = expected('pending', { originOccurrenceId: 'occ-1', originRecurringMovementId: 'series-1' });
    expect(actionIds(expectedDetail(item, scheduled('active')))).toEqual(['edit-expected', 'dismiss-expected', 'stop-recurring-series', 'duplicate-movement']);
    expect(actionIds(expectedDetail(item, scheduled('deactivated')))).toEqual(['edit-expected', 'dismiss-expected', 'duplicate-movement']);
  });

  it('expected recurring_unlinked has edit and dismiss without stop', () => {
    expect(actionIds(expectedDetail(expected('pending', { originOccurrenceId: 'occ-1' })))).toEqual(['edit-expected', 'dismiss-expected', 'duplicate-movement']);
  });

  it('keeps expected and recurring identifiers on their own actions', () => {
    const projectedActions = buildMovementDetailActions(expectedDetail(
      expected('pending', { originOccurrenceId: 'occ-1', originRecurringMovementId: 'series-1' }),
      scheduled(),
    ));
    expect(projectedActions.find((action) => action.id === 'dismiss-expected')).toMatchObject({ expectedMovementId: 'expected-1' });
    expect(projectedActions.find((action) => action.id === 'stop-recurring-series')).toMatchObject({ recurringMovementId: 'series-1' });
    expect(projectedActions.find((action) => action.id === 'dismiss-expected')).not.toMatchObject({ expectedMovementId: 'series-1' });
    expect(projectedActions.find((action) => action.id === 'stop-recurring-series')).not.toMatchObject({ recurringMovementId: 'expected-1' });
  });

  it('duplicate is never destructive and only carries source identity', () => {
    const action = buildMovementDetailActions({ source: 'posted', id: 'tx-1', canVoid: false } as MovementDetailViewModel)
      .find((candidate) => candidate.id === 'duplicate-movement');
    expect(action).toEqual({ id: 'duplicate-movement', source: 'posted', movementId: 'tx-1', label: 'Duplicate', destructive: false });
    expect(action).not.toHaveProperty('raw');
  });

  it.each([
    ['loading', false],
    ['unavailable', false],
    ['ready', true],
  ] as const)('only exposes duplicate when posted detail is %s', (duplicateReadiness, available) => {
    const action = buildMovementDetailActions({
      source: 'posted', id: 'tx-1', canVoid: false, duplicateReadiness,
    } as MovementDetailViewModel).find((candidate) => candidate.id === 'duplicate-movement');
    expect(action !== undefined).toBe(available);
  });
});
