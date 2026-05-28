import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type {
  MovementsPaginationView,
  MovementsSearchFiltersState,
  MovementsSearchItemView,
} from './movementsView.types';
import { DEFAULT_MOVEMENTS_SEARCH_FILTERS } from './movementsSearchFilters';

export type MovementsSearchAccount = Pick<LedgerAccountItem, 'id' | 'name'>;

export const EMPTY_MOVEMENTS_SEARCH_ITEMS: MovementsSearchItemView[] = [];

export function emptyMovementsSearchPagination(
  pageSize = DEFAULT_MOVEMENTS_SEARCH_FILTERS.pageSize,
): MovementsPaginationView {
  return {
    page: 0,
    size: pageSize,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };
}

export const EMPTY_MOVEMENTS_SEARCH_PAGINATION = emptyMovementsSearchPagination();

export function getMovementsSearchAccountScope(
  accounts: MovementsSearchAccount[],
  accountId: string | null,
): MovementsSearchAccount[] {
  if (!accountId) {
    return accounts;
  }
  return accounts.filter((account) => account.id === accountId);
}

export function getMovementsSearchAccountScopeKey(
  accountScope: MovementsSearchAccount[],
  accountId: string | null,
): string {
  if (accountId) {
    return `account:${accountId}`;
  }
  return `all:${accountScope.map((account) => `${account.id}:${account.name}`).join('|')}`;
}

export function withMovementsSearchAccountContext(
  item: MovementsSearchItemView,
  account: MovementsSearchAccount,
): MovementsSearchItemView {
  return {
    ...item,
    accountId: account.id,
    accountName: account.name,
  };
}

function compareDates(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }
  return left.localeCompare(right);
}

function compareAmounts(left: string, right: string): number {
  const leftAmount = Number(left);
  const rightAmount = Number(right);
  if (Number.isFinite(leftAmount) && Number.isFinite(rightAmount)) {
    return leftAmount - rightAmount;
  }
  return left.localeCompare(right);
}

export function compareMovementsSearchItems(
  left: MovementsSearchItemView,
  right: MovementsSearchItemView,
  filters: MovementsSearchFiltersState,
): number {
  const direction = filters.sortDirection === 'asc' ? 1 : -1;
  const primary = filters.sortField === 'amount'
    ? compareAmounts(left.amount, right.amount)
    : compareDates(left.occurredAt, right.occurredAt);
  if (primary !== 0) {
    return primary * direction;
  }

  const fallbackDate = compareDates(left.occurredAt, right.occurredAt);
  if (fallbackDate !== 0) {
    return fallbackDate * -1;
  }

  return `${left.accountId ?? ''}:${left.source}:${left.id}`.localeCompare(`${right.accountId ?? ''}:${right.source}:${right.id}`);
}

export function uniqueMovementsSearchItems(items: MovementsSearchItemView[]): MovementsSearchItemView[] {
  const seen = new Set<string>();
  const unique: MovementsSearchItemView[] = [];
  for (const item of items) {
    const key = `${item.accountId ?? ''}:${item.source}:${item.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function paginateMovementsSearchItems(
  items: MovementsSearchItemView[],
  filters: MovementsSearchFiltersState,
  requestedPage: number,
): { items: MovementsSearchItemView[]; pagination: MovementsPaginationView } {
  const pageSize = filters.pageSize;
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(requestedPage, totalPages - 1);
  const start = resolvedPage * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page: resolvedPage,
      size: pageSize,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    },
  };
}

export function aggregateMovementsSearchResults(
  collected: MovementsSearchItemView[],
  filters: MovementsSearchFiltersState,
  requestedPage: number,
): { items: MovementsSearchItemView[]; pagination: MovementsPaginationView; page: number } {
  const sortedItems = uniqueMovementsSearchItems(collected).sort((left, right) => (
    compareMovementsSearchItems(left, right, filters)
  ));
  const result = paginateMovementsSearchItems(sortedItems, filters, requestedPage);
  return {
    ...result,
    page: result.pagination.page,
  };
}
