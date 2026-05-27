import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovementsSearchFacetsModel } from './useMovementsSearchFacetsModel';

describe('useMovementsSearchFacetsModel', () => {
  it('caches facets for the current account scope and reloads after reset', async () => {
    const core = {
      movementsGetSearchFacets: vi.fn(async () => ({
        categories: [{ id: 'cat-food', name: 'Food', appliesTo: 'expense' as const }],
        tags: [{ id: 'tag-home', name: 'home' }],
      })),
    };
    const { result } = renderHook(() => useMovementsSearchFacetsModel({
      core,
      accountScope: [{ id: 'acc-1', name: 'Main' }],
      accountScopeKey: 'account:acc-1',
    }));

    await act(async () => {
      await result.current.ensureLoaded();
    });
    await act(async () => {
      await result.current.ensureLoaded();
    });

    expect(core.movementsGetSearchFacets).toHaveBeenCalledTimes(1);
    expect(result.current.filterOptions).toEqual({
      categories: [{ id: 'cat-food', label: 'Food' }],
      tags: [{ id: 'tag-home', label: 'home' }],
    });

    act(() => {
      result.current.reset();
    });
    await act(async () => {
      await result.current.ensureLoaded();
    });

    expect(core.movementsGetSearchFacets).toHaveBeenCalledTimes(2);
  });
});
