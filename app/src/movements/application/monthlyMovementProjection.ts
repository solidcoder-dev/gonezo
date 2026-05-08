import type { ExpectedMovementItem, SchedulingMovementItem } from '../../shared/domain/corePort';

export function filterProjectedScheduledMovements(
  scheduledItems: SchedulingMovementItem[],
  expectedItems: ExpectedMovementItem[],
): SchedulingMovementItem[] {
  const expectedOriginIds = new Set(
    expectedItems
      .map((item) => item.originOccurrenceId)
      .filter((originOccurrenceId): originOccurrenceId is string => Boolean(originOccurrenceId)),
  );

  return scheduledItems
    .filter((item) => item.status === 'active')
    .filter((item) => !expectedOriginIds.has(item.id));
}
