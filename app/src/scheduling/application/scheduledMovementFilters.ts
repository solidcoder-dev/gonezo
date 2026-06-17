import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { parseDateFilterEpoch } from '../../shared/domain/dateFilterRange';
import type { SchedulingMovementItem } from './scheduling.port';

export type StoredScheduledMovement = SchedulingMovementItem & {
  createdAt: string;
};

export type ScheduledMovementFilterInput = {
  text?: string;
  merchant?: string;
  categoryId?: string;
  categoryIds?: string[];
  tagIds?: string[];
  amountMin?: string;
  amountMax?: string;
  fromDate?: string;
  toDate?: string;
  types?: Array<'income' | 'expense' | 'transfer' | string>;
};

export function scheduledMovementDateEpoch(movement: SchedulingMovementItem): number | undefined {
  const candidate = movement.nextDueAt ?? movement.startAt;
  const parsed = candidate ? Date.parse(candidate) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isScheduledMovementVisibleForAccount(
  movement: SchedulingMovementItem,
  accountId: string,
): boolean {
  if (movement.sourceAccountId === accountId) {
    return true;
  }
  return movement.type === 'transfer' && movement.targetAccountId === accountId;
}

export function compareScheduledMovementByDue(
  left: StoredScheduledMovement,
  right: StoredScheduledMovement,
): number {
  if (!left.nextDueAt && !right.nextDueAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }
  if (!left.nextDueAt) {
    return 1;
  }
  if (!right.nextDueAt) {
    return -1;
  }
  return left.nextDueAt.localeCompare(right.nextDueAt);
}

export function filterScheduledMovements(
  movements: StoredScheduledMovement[],
  input: {
    accountId: string;
    filters?: ScheduledMovementFilterInput;
  },
): SchedulingMovementItem[] {
  const filters = input.filters ?? {};
  const text = filters.text?.trim().toLowerCase();
  const merchant = filters.merchant?.trim().toLowerCase();
  const categoryFilter = toSetFilter(filters.categoryIds && filters.categoryIds.length > 0
    ? filters.categoryIds
    : filters.categoryId
      ? [filters.categoryId]
      : []);
  const tagFilter = toSetFilter(filters.tagIds ?? []);
  const amountRange = parseAmountRange(filters.amountMin, filters.amountMax);
  const dateRange = parseDateRange(filters.fromDate, filters.toDate);
  const typeFilter = filters.types && filters.types.length > 0
    ? new Set(filters.types.filter((value) => value === 'expense' || value === 'income' || value === 'transfer'))
    : null;

  const filtered = movements
    .filter((movement) => isScheduledMovementVisibleForAccount(movement, input.accountId))
    .filter((movement) => (typeFilter ? typeFilter.has(movement.type) : true))
    .filter((movement) => (categoryFilter ? Boolean(movement.categoryId && categoryFilter.has(movement.categoryId)) : true))
    .filter((movement) => {
      if (!tagFilter) {
        return true;
      }
      const movementTags = movement.tagIds ?? [];
      return movementTags.some((tagId) => tagFilter.has(tagId));
    })
    .filter((movement) => matchesAmountRange(movement.amount, amountRange))
    .filter((movement) => {
      if (!dateRange.hasFromDateEpoch && !dateRange.hasToDateEpoch) {
        return true;
      }
      const dueEpoch = scheduledMovementDateEpoch(movement);
      return dueEpoch != null && matchesDateRange(dueEpoch, dateRange);
    })
    .filter((movement) => !merchant || (movement.merchant ?? '').toLowerCase().includes(merchant))
    .filter((movement) => {
      if (!text) {
        return true;
      }
      const merchantText = movement.merchant?.toLowerCase() ?? '';
      const descriptionText = movement.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    })
    .sort(compareScheduledMovementByDue);

  return filtered.map((item) => {
    const kind = resolveSchedulingKind(item);
    return {
      ...item,
      scheduleKind: kind,
      origin: kind,
    };
  });
}

function toSetFilter(values: string[]): Set<string> | null {
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return normalized.length > 0 ? new Set(normalized) : null;
}

function parseAmountRange(amountMin?: string, amountMax?: string) {
  const parsedAmountMin = amountMin == null ? undefined : Number(amountMin);
  const parsedAmountMax = amountMax == null ? undefined : Number(amountMax);
  return {
    parsedAmountMin,
    parsedAmountMax,
    hasAmountMin: typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin),
    hasAmountMax: typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax),
  };
}

function matchesAmountRange(
  rawAmount: string,
  range: ReturnType<typeof parseAmountRange>,
): boolean {
  if (!range.hasAmountMin && !range.hasAmountMax) {
    return true;
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) {
    return false;
  }
  if (range.hasAmountMin && amount < range.parsedAmountMin!) {
    return false;
  }
  if (range.hasAmountMax && amount > range.parsedAmountMax!) {
    return false;
  }
  return true;
}

function parseDateRange(fromDate?: string, toDate?: string) {
  const fromDateEpoch = parseDateFilterEpoch(fromDate, 'start');
  const toDateEpoch = parseDateFilterEpoch(toDate, 'end');
  return {
    fromDateEpoch,
    toDateEpoch,
    hasFromDateEpoch: typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch),
    hasToDateEpoch: typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch),
  };
}

function matchesDateRange(epoch: number, range: ReturnType<typeof parseDateRange>): boolean {
  if (range.hasFromDateEpoch && epoch < range.fromDateEpoch!) {
    return false;
  }
  if (range.hasToDateEpoch && epoch > range.toDateEpoch!) {
    return false;
  }
  return true;
}
