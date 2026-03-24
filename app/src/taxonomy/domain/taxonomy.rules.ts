import type { TaxonomyCategoryView, TaxonomyTagView } from './taxonomy.types';

export function listActiveCategories(items: TaxonomyCategoryView[], appliesTo?: 'income' | 'expense') {
  return items
    .filter((item) => item.status === 'active')
    .filter((item) => !appliesTo || item.appliesTo === appliesTo)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listActiveTags(items: TaxonomyTagView[]) {
  return items
    .filter((item) => item.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));
}
