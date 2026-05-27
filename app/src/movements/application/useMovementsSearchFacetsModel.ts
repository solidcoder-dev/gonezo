import { useMemo, useRef, useState } from 'react';
import type {
  MovementsSearchFacetCategory,
  MovementsSearchFacetTag,
} from '../../shared/domain/corePort';
import type { MovementsFilterOptionsView } from '../domain/movementsView.types';
import type { MovementsSearchFacetsPort } from './movementsSearch.port';
import type { MovementsSearchAccount } from './movementsSearchResults';

type UseMovementsSearchFacetsModelInput = {
  core: MovementsSearchFacetsPort;
  accountScope: MovementsSearchAccount[];
  accountScopeKey: string;
};

export type MovementsSearchFacetsModel = {
  filterOptions: MovementsFilterOptionsView;
  reset: () => void;
  ensureLoaded: () => Promise<{ categories: MovementsSearchFacetCategory[]; tags: MovementsSearchFacetTag[] }>;
};

export function useMovementsSearchFacetsModel(
  input: UseMovementsSearchFacetsModelInput,
): MovementsSearchFacetsModel {
  const { core, accountScope, accountScopeKey } = input;
  const [categories, setCategories] = useState<MovementsSearchFacetCategory[]>([]);
  const [tags, setTags] = useState<MovementsSearchFacetTag[]>([]);
  const loadedScopeRef = useRef('');

  const filterOptions = useMemo(
    () => ({
      categories: categories.map((category) => ({ id: category.id, label: category.name })),
      tags: tags.map((tag) => ({ id: tag.id, label: tag.name })),
    }),
    [categories, tags],
  );

  function reset() {
    loadedScopeRef.current = '';
    setCategories((previous) => (previous.length === 0 ? previous : []));
    setTags((previous) => (previous.length === 0 ? previous : []));
  }

  async function ensureLoaded(): Promise<{ categories: MovementsSearchFacetCategory[]; tags: MovementsSearchFacetTag[] }> {
    if (accountScope.length === 0) {
      loadedScopeRef.current = accountScopeKey;
      setCategories([]);
      setTags([]);
      return { categories: [], tags: [] };
    }

    if (loadedScopeRef.current === accountScopeKey) {
      return { categories, tags };
    }

    const result = await core.movementsGetSearchFacets({
      accountIds: accountScope.map((account) => account.id),
    });
    loadedScopeRef.current = accountScopeKey;
    setCategories(result.categories);
    setTags(result.tags);
    return result;
  }

  return {
    filterOptions,
    reset,
    ensureLoaded,
  };
}
