import type { MovementsSearchFiltersState } from './movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';
import type { MovementsSearchSourceView, LedgerTransactionTypeView } from './movementsView.types';

export type MovementSearchPreset = {
  source: MovementsSearchSourceView;
  type?: Extract<LedgerTransactionTypeView, 'income' | 'expense' | 'transfer'>;
  fromDate?: string;
  toDate?: string;
  categoryIds?: string[];
  uncategorized?: boolean;
  tagIds?: string[];
  currency?: string;
  accountIds?: string[];
  merchant?: string;
  sharing?: 'shared';
  sharingPersonId?: string;
  returnTo?: string;
};

function uniqueList(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function validIsoDate(value: string | null): value is string {
  return value == null || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function safeMovementSearchReturnTo(value: string | null | undefined): string | undefined {
  return value?.startsWith('/') && !value.startsWith('//') && value !== '/movements/new' ? value : undefined;
}

export function buildMovementSearchHref(preset: MovementSearchPreset): string {
  const params = new URLSearchParams({ source: preset.source });
  if (preset.type) params.set('type', preset.type);
  if (preset.fromDate) params.set('fromDate', preset.fromDate);
  if (preset.toDate) params.set('toDate', preset.toDate);
  const categoryIds = uniqueList(preset.categoryIds);
  if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
  if (preset.uncategorized) params.set('uncategorized', '1');
  const tagIds = uniqueList(preset.tagIds);
  if (tagIds.length) params.set('tagIds', tagIds.join(','));
  if (preset.currency?.trim()) params.set('currency', preset.currency.trim().toUpperCase());
  const accountIds = uniqueList(preset.accountIds);
  if (accountIds.length) params.set('accountIds', accountIds.join(','));
  if (preset.merchant?.trim()) params.set('merchant', preset.merchant.trim());
  if (preset.sharing === 'shared') params.set('sharing', 'shared');
  if (preset.sharingPersonId?.trim()) params.set('sharingPersonId', preset.sharingPersonId.trim());
  const returnTo = safeMovementSearchReturnTo(preset.returnTo);
  if (returnTo) params.set('returnTo', returnTo);
  return `/movements/search?${params.toString()}`;
}

export function parseMovementsSearchRoutePreset(search: string): MovementsSearchFiltersState {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const type = params.get('type');
  const state = params.get('state');
  const filters = createDefaultMovementsSearchFilters();
  if (source !== 'posted' && source !== 'expected' || (source === 'expected' && state !== null && state !== 'pending')) return filters;
  if (type !== null && type !== 'expense' && type !== 'income' && type !== 'transfer') return filters;
  if (!validIsoDate(params.get('fromDate')) || !validIsoDate(params.get('toDate'))) return filters;
  const currency = params.get('currency')?.trim().toUpperCase() ?? '';
  const sharing = params.get('sharing');
  if (sharing !== null && sharing !== 'shared') return filters;
  filters.source = 'expected';
  if (source === 'posted') filters.source = 'posted';
  filters.types = type ? [type] : [];
  filters.currency = currency;
  filters.accountIds = splitList(params.get('accountIds'));
  const fromDate = params.get('fromDate');
  const toDate = params.get('toDate');
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;
  filters.categoryIds = splitList(params.get('categoryIds'));
  filters.uncategorized = params.get('uncategorized') === '1';
  filters.tagIds = splitList(params.get('tagIds'));
  filters.merchant = params.get('merchant')?.trim() ?? '';
  filters.sharing = sharing === 'shared' ? 'shared' : 'all';
  filters.sharingPersonId = params.get('sharingPersonId')?.trim() ?? '';
  return filters;
}

function splitList(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}
