import type { TransactionHistoryItemView } from '../domain/transactionView.types';

export type PostedDateGroup = {
  key: string;
  label: string;
  items: TransactionHistoryItemView[];
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatCalendarDay(isoDateTime: string, now = new Date()): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }

  const parsedKey = localDateKey(parsed);
  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(addDays(now, -1));

  if (parsedKey === todayKey) {
    return 'Today';
  }
  if (parsedKey === yesterdayKey) {
    return 'Yesterday';
  }

  const sameYear = parsed.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

function compareByOccurredAtDescending(left: TransactionHistoryItemView, right: TransactionHistoryItemView): number {
  const leftEpoch = Date.parse(left.occurredAt);
  const rightEpoch = Date.parse(right.occurredAt);
  if (Number.isFinite(leftEpoch) && Number.isFinite(rightEpoch) && leftEpoch !== rightEpoch) {
    return rightEpoch - leftEpoch;
  }
  if (left.id !== right.id) {
    return right.id.localeCompare(left.id);
  }
  return 0;
}

export function groupPostedTransactionsByDate(
  items: TransactionHistoryItemView[],
  now = new Date(),
): PostedDateGroup[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort(compareByOccurredAtDescending);
  const groups: PostedDateGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const item of sorted) {
    const occurredAt = new Date(item.occurredAt);
    const key = Number.isNaN(occurredAt.getTime()) ? item.occurredAt : localDateKey(occurredAt);
    const knownIndex = groupIndexByKey.get(key);
    if (knownIndex == null) {
      groups.push({
        key,
        label: formatCalendarDay(item.occurredAt, now),
        items: [item],
      });
      groupIndexByKey.set(key, groups.length - 1);
      continue;
    }
    groups[knownIndex].items.push(item);
  }

  return groups;
}

