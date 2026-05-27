import type { MovementsSearchInput } from '../../shared/domain/corePort';
import type { MovementsSearchFiltersState } from '../domain/movementsView.types';

export const DEFAULT_MOVEMENTS_SEARCH_FILTERS: MovementsSearchFiltersState = {
  source: 'posted',
  text: '',
  merchant: '',
  categoryIds: [],
  tagIds: [],
  amountMin: '',
  amountMax: '',
  fromDate: '',
  toDate: '',
  types: [],
  sortField: 'date',
  sortDirection: 'desc',
  pageSize: 10,
  groupByDay: true,
};

export function createDefaultMovementsSearchFilters(): MovementsSearchFiltersState {
  return {
    ...DEFAULT_MOVEMENTS_SEARCH_FILTERS,
    categoryIds: [],
    tagIds: [],
    types: [],
  };
}

export function normalizeMovementSearchIdentifierList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeMovementSearchAmount(value: string): string | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric.toString();
}

function normalizeMovementSearchDate(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizedAmountRange(
  filters: MovementsSearchFiltersState,
): Pick<NonNullable<MovementsSearchInput['filters']>, 'amountMin' | 'amountMax'> {
  let amountMin = normalizeMovementSearchAmount(filters.amountMin);
  let amountMax = normalizeMovementSearchAmount(filters.amountMax);
  if (amountMin != null && amountMax != null && Number(amountMin) > Number(amountMax)) {
    [amountMin, amountMax] = [amountMax, amountMin];
  }
  return { amountMin, amountMax };
}

export function buildMovementsSearchFilters(filters: MovementsSearchFiltersState): MovementsSearchInput['filters'] {
  const normalizedCategoryIds = normalizeMovementSearchIdentifierList(filters.categoryIds);
  const normalizedTagIds = normalizeMovementSearchIdentifierList(filters.tagIds);
  const { amountMin, amountMax } = normalizedAmountRange(filters);

  return {
    text: filters.text.trim() || undefined,
    merchant: filters.merchant.trim() || undefined,
    categoryIds: normalizedCategoryIds.length > 0 ? normalizedCategoryIds : undefined,
    categoryId: normalizedCategoryIds.length === 1 ? normalizedCategoryIds[0] : undefined,
    tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
    amountMin,
    amountMax,
    fromDate: normalizeMovementSearchDate(filters.fromDate),
    toDate: normalizeMovementSearchDate(filters.toDate),
    types: filters.types.length > 0 ? filters.types : undefined,
  };
}

export function buildPostedTaxonomyCandidateFilters(
  filters: MovementsSearchFiltersState,
): MovementsSearchInput['filters'] {
  const { amountMin, amountMax } = normalizedAmountRange(filters);

  return {
    text: filters.text.trim() || undefined,
    merchant: filters.merchant.trim() || undefined,
    amountMin,
    amountMax,
    fromDate: normalizeMovementSearchDate(filters.fromDate),
    toDate: normalizeMovementSearchDate(filters.toDate),
    types: filters.types.length > 0 ? filters.types : undefined,
  };
}

export function mergeMovementsSearchFilterPatch(
  base: MovementsSearchFiltersState,
  patch: Partial<MovementsSearchFiltersState>,
): MovementsSearchFiltersState {
  const next: MovementsSearchFiltersState = {
    ...base,
    ...patch,
  };
  if (patch.categoryIds != null) {
    next.categoryIds = normalizeMovementSearchIdentifierList(patch.categoryIds);
  }
  if (patch.tagIds != null) {
    next.tagIds = normalizeMovementSearchIdentifierList(patch.tagIds);
  }
  if (patch.pageSize != null) {
    const parsedPageSize = Number(patch.pageSize);
    next.pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(Math.trunc(parsedPageSize), 100)
      : DEFAULT_MOVEMENTS_SEARCH_FILTERS.pageSize;
  }
  if (patch.types != null) {
    next.types = [...new Set(patch.types)];
  }
  return next;
}
