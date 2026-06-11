import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';

function toDateInputValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function nextRequestId(requestId?: number): number {
  return requestId ?? Date.now();
}

export function expectedMovementToComposerPrefill(
  movement: ExpectedMovementView,
  _categoryName?: string,
  requestId?: number,
): TransactionEntryPrefillRequest {
  return {
    requestId: nextRequestId(requestId),
    editedExpectedMovementId: movement.id,
    mode: movement.type,
    amount: movement.amount,
    date: toDateInputValue(movement.expectedAt),
    note: movement.merchant || movement.description || '',
    categoryId: movement.categoryId,
    splitItems: movement.splitItems,
  };
}

export function postExpectedMovementToComposerPrefill(
  movement: ExpectedMovementView,
  _categoryName?: string,
  requestId?: number,
): TransactionEntryPrefillRequest {
  return {
    requestId: nextRequestId(requestId),
    postExpectedMovementId: movement.id,
    mode: movement.type,
    amount: movement.amount,
    date: toDateInputValue(movement.expectedAt),
    note: movement.merchant || movement.description || '',
    categoryId: movement.categoryId,
    splitItems: movement.splitItems,
  };
}

export function scheduledMovementToComposerPrefill(
  movement: ScheduledMovementView,
  _categoryName?: string,
  requestId?: number,
): TransactionEntryPrefillRequest {
  const scheduledKind = movement.scheduleKind ?? resolveSchedulingKind(movement);
  return {
    requestId: nextRequestId(requestId),
    editedScheduledMovementId: movement.id,
    mode: movement.type,
    amount: movement.amount,
    date: toDateInputValue(movement.nextDueAt ?? movement.startAt),
    note: movement.merchant || movement.description || '',
    categoryId: movement.categoryId,
    splitItems: movement.splitItems,
    transferTargetAccountId: movement.targetAccountId,
    transferAmountIn: movement.destinationAmount,
    transferFxRate: movement.exchangeRate,
    transferFxMode: movement.destinationAmount ? 'auto_destination' : 'auto_rate',
    transferDestinationCurrency: movement.destinationCurrency,
    schedulingMode: 'scheduled',
    schedulingKind: scheduledKind,
    recurrenceFrequency: movement.rule.frequency,
    recurrenceInterval: String(movement.rule.interval ?? 1),
    recurrenceWeeklyDay: String(movement.rule.weeklyDays?.[0] ?? 1),
    recurrenceMonthlyPattern: movement.rule.monthlyPattern,
    recurrenceDayOfMonth: String(movement.rule.dayOfMonth ?? 1),
    recurrenceMonthlyOrdinal: String(movement.rule.monthlyWeekOrdinal ?? 1),
    recurrenceMonthlyWeekday: String(movement.rule.monthlyWeekday ?? 1),
    recurrenceEndKind: movement.recurrenceEnd.kind,
    recurrenceEndDate: movement.recurrenceEnd.kind === 'on_date' ? movement.recurrenceEnd.onDate : '',
    recurrenceEndCount: movement.recurrenceEnd.kind === 'after_occurrences'
      ? String(movement.recurrenceEnd.afterOccurrences ?? 1)
      : '',
  };
}
