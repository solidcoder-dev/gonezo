import { useCallback } from 'react';
import type { TaxonomyGatewayPort } from '../infrastructure/taxonomyGateway';

export function useCategorySuggestions(gateway: TaxonomyGatewayPort) {
  const listCategories = useCallback(
    (input?: { appliesTo?: 'income' | 'expense'; includeArchived?: boolean }) =>
      gateway.taxonomyListCategories(input),
    [gateway],
  );

  const createCategory = useCallback(
    (input: { name: string; appliesTo: 'income' | 'expense' }) => gateway.taxonomyCreateCategory(input),
    [gateway],
  );

  return {
    listCategories,
    createCategory,
  };
}
