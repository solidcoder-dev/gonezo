import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';

export function filterProjectedScheduledMovements(
  scheduledItems: SchedulingMovementItem[],
): SchedulingMovementItem[] {
  return scheduledItems
    .filter((item) => item.status === 'active')
    .filter((item) => item.reviewPolicy !== 'require_user_confirmation');
}
