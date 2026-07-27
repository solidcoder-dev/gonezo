import type { MovementsSearchFiltersState } from './movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';

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
  return filters;
}
