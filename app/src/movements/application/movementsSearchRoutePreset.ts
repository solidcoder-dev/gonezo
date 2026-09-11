import type { MovementsSearchFiltersState } from './movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';
import type { MovementsSearchSourceView, LedgerTransactionTypeView } from './movementsView.types';

export type MovementSearchPreset = {
  source: MovementsSearchSourceView;
  type?: Extract<LedgerTransactionTypeView, 'income' | 'expense'>;
  fromDate?: string;
  toDate?: string;
  categoryIds?: string[];
  tagIds?: string[];
  merchant?: string;
  returnTo?: string;
};

export function buildMovementSearchHref(preset: MovementSearchPreset): string {
  const params = new URLSearchParams({ source: preset.source });
  if (preset.type) params.set('type', preset.type);
  if (preset.fromDate) params.set('fromDate', preset.fromDate);
  if (preset.toDate) params.set('toDate', preset.toDate);
  if (preset.categoryIds?.length) params.set('categoryIds', preset.categoryIds.join(','));
  if (preset.tagIds?.length) params.set('tagIds', preset.tagIds.join(','));
  if (preset.merchant?.trim()) params.set('merchant', preset.merchant.trim());
  if (preset.returnTo?.startsWith('/')) params.set('returnTo', preset.returnTo);
  return `/movements/search?${params.toString()}`;
}

export function parseMovementsSearchRoutePreset(search: string): MovementsSearchFiltersState {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const type = params.get('type');
  const state = params.get('state');
  const filters = createDefaultMovementsSearchFilters();
  if (source !== 'posted' && source !== 'expected' || (source === 'expected' && state !== null && state !== 'pending')) return filters;
  if (type !== null && type !== 'expense' && type !== 'income') return filters;
  filters.source = 'expected';
  if (source === 'posted') filters.source = 'posted';
  filters.types = type ? [type] : [];
  const fromDate = params.get('fromDate');
  const toDate = params.get('toDate');
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;
  filters.categoryIds = splitList(params.get('categoryIds'));
  filters.tagIds = splitList(params.get('tagIds'));
  filters.merchant = params.get('merchant')?.trim() ?? '';
  return filters;
}

function splitList(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}
