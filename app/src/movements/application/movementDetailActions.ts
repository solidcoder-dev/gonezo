import type {
  ExpectedMovementDetailViewModel,
  MovementDetailOverflowAction,
  MovementDetailViewModel,
  PostedMovementDetailViewModel,
  ScheduledMovementDetailViewModel,
} from './movementDetailView.types';

function postedActions(movement: PostedMovementDetailViewModel): MovementDetailOverflowAction[] {
  const actions: MovementDetailOverflowAction[] = [];
  if (movement.canVoid) {
    actions.push({ id: 'void-posted', transactionId: movement.id, label: 'Void movement', destructive: true });
  }
  if (movement.duplicateReadiness !== 'loading' && movement.duplicateReadiness !== 'unavailable') {
    actions.push({ id: 'duplicate-movement', source: 'posted', movementId: movement.id, label: 'Duplicate', destructive: false });
  }
  return actions;
}

function scheduledActions(movement: ScheduledMovementDetailViewModel): MovementDetailOverflowAction[] {
  const actions: MovementDetailOverflowAction[] = [];
  if (movement.canStopFutureMovements) {
    actions.push({ id: 'stop-recurring-series', recurringMovementId: movement.id, label: 'Stop future movements', destructive: true });
  }
  actions.push({ id: 'duplicate-movement', source: 'scheduled', movementId: movement.id, label: 'Duplicate', destructive: false });
  return actions;
}

function expectedActions(movement: ExpectedMovementDetailViewModel): MovementDetailOverflowAction[] {
  const actions: MovementDetailOverflowAction[] = [];
  if (movement.canEditExpected) {
    actions.push({ id: 'edit-expected', expectedMovementId: movement.id, label: 'Edit expected', destructive: false });
  }
  if (movement.canDismissExpected) {
    actions.push({ id: 'dismiss-expected', expectedMovementId: movement.id, label: 'Delete expected', destructive: true });
  }
  if (movement.series.kind === 'recurring' && movement.series.series?.canStopFutureMovements) {
    actions.push({ id: 'stop-recurring-series', recurringMovementId: movement.series.series.id, label: 'Stop future movements', destructive: true });
  }
  actions.push({ id: 'duplicate-movement', source: 'expected', movementId: movement.id, label: 'Duplicate', destructive: false });
  return actions;
}

export function buildMovementDetailActions(movement: MovementDetailViewModel): MovementDetailOverflowAction[] {
  if (movement.source === 'posted') return postedActions(movement);
  if (movement.source === 'scheduled') return scheduledActions(movement);
  return expectedActions(movement);
}
