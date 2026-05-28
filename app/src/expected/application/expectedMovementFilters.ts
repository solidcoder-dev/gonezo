import type { ExpectedMovementItem } from './expectedCore.port';

export type ExpectedMovementFilterInput = {
  text?: string;
  merchant?: string;
  categoryId?: string;
  categoryIds?: string[];
  amountMin?: string;
  amountMax?: string;
  fromDate?: string;
  toDate?: string;
  types?: Array<'income' | 'expense' | string>;
};

export function filterExpectedMovements(
  movements: ExpectedMovementItem[],
  input: {
    accountId: string;
    filters?: ExpectedMovementFilterInput;
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
