import type {
  ExpectedMovementItem,
  LedgerTransactionListItem,
  MovementsSearchFiltersInput,
  MovementsSearchItem,
  SchedulingMovementItem,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';

export type StoredScheduledMovement = SchedulingMovementItem & {
  createdAt: string;
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
    filters?: MovementsSearchFiltersInput;
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

export function filterExpectedMovements(
  movements: ExpectedMovementItem[],
  input: {
    accountId: string;
    filters?: MovementsSearchFiltersInput;
    includeClosed?: boolean;
  },
): ExpectedMovementItem[] {
  const filters = input.filters ?? {};
  const text = filters.text?.trim().toLowerCase();
  const merchant = filters.merchant?.trim().toLowerCase();
  const categoryFilter = toSetFilter(filters.categoryIds && filters.categoryIds.length > 0
    ? filters.categoryIds
    : filters.categoryId
      ? [filters.categoryId]
      : []);
  const typeFilter = filters.types && filters.types.length > 0
    ? new Set(filters.types.filter((value) => value === 'expense' || value === 'income'))
    : null;
  const amountRange = parseAmountRange(filters.amountMin, filters.amountMax);
  const dateRange = parseDateRange(filters.fromDate, filters.toDate);

  return movements
    .filter((movement) => movement.accountId === input.accountId)
    .filter((movement) => input.includeClosed || movement.status === 'pending')
    .filter((movement) => (typeFilter ? typeFilter.has(movement.type) : true))
    .filter((movement) => (categoryFilter ? Boolean(movement.categoryId && categoryFilter.has(movement.categoryId)) : true))
    .filter((movement) => matchesAmountRange(movement.amount, amountRange))
    .filter((movement) => {
      if (!dateRange.hasFromDateEpoch && !dateRange.hasToDateEpoch) {
        return true;
      }
      const expectedAtEpoch = Date.parse(movement.expectedAt);
      return Number.isFinite(expectedAtEpoch) && matchesDateRange(expectedAtEpoch, dateRange);
    })
    .filter((movement) => !merchant || (movement.merchant ?? '').toLowerCase().includes(merchant))
    .filter((movement) => {
      if (!text) {
        return true;
      }
      const merchantText = movement.merchant?.toLowerCase() ?? '';
      const descriptionText = movement.description?.toLowerCase() ?? '';
      return merchantText.includes(text) || descriptionText.includes(text);
    });
}

export function mapPostedTransactionToSearchItem(transaction: LedgerTransactionListItem): MovementsSearchItem {
  return {
    id: transaction.id,
    source: 'posted',
    type: transaction.type,
    status: transaction.status === 'voided' ? 'voided' : 'posted',
    amount: transaction.amount,
    currency: transaction.currency,
    occurredAt: transaction.occurredAt,
    title: transaction.merchant || transaction.description || 'Movement',
    description: transaction.description,
    merchant: transaction.merchant,
    categoryId: transaction.categoryId,
    category: transaction.category,
    tags: transaction.tags,
    items: transaction.items,
  };
}

export function mapScheduledMovementToSearchItem(
  movement: SchedulingMovementItem,
  categoryNameById: (categoryId: string) => string | undefined,
): MovementsSearchItem {
  const tags = (movement.tagNames ?? movement.tagIds ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => ({ id: tag, name: tag }));
  return {
    id: movement.id,
    source: 'scheduled',
    type: movement.type,
    status: movement.status === 'active' ? 'scheduled' : movement.status === 'deactivated' ? 'deactivated' : 'failed',
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.nextDueAt ?? movement.startAt,
    title: movement.merchant || movement.description || 'Scheduled movement',
    description: movement.description,
    merchant: movement.merchant,
    category: movement.categoryId ? { id: movement.categoryId, name: categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
    tags,
    items: movement.splitItems,
  };
}

export function mapExpectedMovementToSearchItem(
  movement: ExpectedMovementItem,
  categoryNameById: (categoryId: string) => string | undefined,
): MovementsSearchItem {
  return {
    id: movement.id,
    source: 'expected',
    type: movement.type,
    status: movement.status === 'pending' ? 'expected' : movement.status,
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.expectedAt,
    title: movement.merchant || movement.description || 'Expected movement',
    description: movement.description,
    merchant: movement.merchant,
    categoryId: movement.categoryId,
    category: movement.categoryId ? { id: movement.categoryId, name: categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
    tags: [],
    items: movement.splitItems,
  };
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
  const fromDateEpoch = fromDate ? Date.parse(fromDate) : undefined;
  const toDateEpoch = toDate ? Date.parse(toDate) : undefined;
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
