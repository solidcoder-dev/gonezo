import type {
  ExpectedMovementDetailViewModel,
  MovementDetailOverflowAction,
  MovementDetailViewModel,
  PostedMovementDetailViewModel,
  ScheduledMovementDetailViewModel,
} from './movementDetailView.types';

function postedActions(movement: PostedMovementDetailViewModel): MovementDetailOverflowAction[] {
  return movement.canVoid
    ? [{ id: 'void-posted', transactionId: movement.id, label: 'Void movement', destructive: true }]
    : [];
}

function scheduledActions(movement: ScheduledMovementDetailViewModel): MovementDetailOverflowAction[] {
  return movement.canStopFutureMovements
    ? [{ id: 'stop-recurring-series', recurringMovementId: movement.id, label: 'Stop future movements', destructive: true }]
    : [];
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
  return actions;
}

export function buildMovementDetailActions(movement: MovementDetailViewModel): MovementDetailOverflowAction[] {
  if (movement.source === 'posted') return postedActions(movement);
  if (movement.source === 'scheduled') return scheduledActions(movement);
  return expectedActions(movement);
}
