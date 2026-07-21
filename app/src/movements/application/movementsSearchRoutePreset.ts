import type { MovementsSearchFiltersState } from './movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';

export function parseMovementsSearchRoutePreset(search: string): MovementsSearchFiltersState {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const type = params.get('type');
  const state = params.get('state');
  const filters = createDefaultMovementsSearchFilters();
  if (source !== 'expected' || (state !== null && state !== 'pending')) return filters;
  if (type !== null && type !== 'expense' && type !== 'income') return filters;
  filters.source = 'expected';
  filters.types = type ? [type] : [];
  return filters;
}
