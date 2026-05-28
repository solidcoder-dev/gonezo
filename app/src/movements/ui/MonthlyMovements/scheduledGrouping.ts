import type { ScheduledMovementView } from '../../application/movementsView.types';
import { formatCalendarDay } from './postedGrouping';

export type ScheduledDateGroup = {
  key: string;
  label: string;
  items: ScheduledMovementView[];
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function movementDate(movement: ScheduledMovementView): string {
  return movement.nextDueAt ?? movement.startAt;
}

function movementDateEpoch(movement: ScheduledMovementView): number {
  const parsed = Date.parse(movementDate(movement));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareByMovementDateAscending(left: ScheduledMovementView, right: ScheduledMovementView): number {
  const leftEpoch = movementDateEpoch(left);
  const rightEpoch = movementDateEpoch(right);
  if (leftEpoch !== rightEpoch) {
    return leftEpoch - rightEpoch;
  }
  return left.id.localeCompare(right.id);
}

export function groupScheduledMovementsByDate(
  items: ScheduledMovementView[],
  now = new Date(),
): ScheduledDateGroup[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort(compareByMovementDateAscending);
  const groups: ScheduledDateGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const item of sorted) {
    const referenceDateIso = movementDate(item);
    const parsed = new Date(referenceDateIso);
    const key = Number.isNaN(parsed.getTime()) ? referenceDateIso : localDateKey(parsed);
    const knownIndex = groupIndexByKey.get(key);
    if (knownIndex == null) {
      groups.push({
        key,
        label: formatCalendarDay(referenceDateIso, now),
        items: [item],
      });
      groupIndexByKey.set(key, groups.length - 1);
      continue;
    }
    groups[knownIndex].items.push(item);
  }

  return groups;
}
