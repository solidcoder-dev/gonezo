import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementsSearchInput, MovementsSearchResult } from './movements.port';
import type { MovementsSearchItemView } from './movementsView.types';
import type { MovementsSearchFacetsPort } from './movementsSearch.port';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';
import { useMovementsSearchModel } from './useMovementsSearchModel';

type SearchCore = PostedTaxonomySearchPort & MovementsSearchFacetsPort;

function searchItem(input: Partial<MovementsSearchItemView> = {}): MovementsSearchItemView {
  return {
    id: 'movement-1',
    source: 'posted',
    type: 'expense',
    status: 'posted',
    amount: '10.00',
    currency: 'USD',
    occurredAt: '2026-06-10T10:00:00.000Z',
    title: 'Movement',
    ...input,
  };
}

function searchResult(
  content: MovementsSearchItemView[],
  overrides: Partial<MovementsSearchResult> = {},
): MovementsSearchResult {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    hasNext: false,
    hasPrevious: false,
    ...overrides,
  };
}

function makeCore(overrides: Partial<SearchCore> = {}): SearchCore {
  return {
    movementsSearch: vi.fn().mockResolvedValue(searchResult([])),
    orchestrationListTransactionTaxonomy: vi.fn().mockResolvedValue({ items: [] }),
    taxonomyListCategories: vi.fn().mockResolvedValue({ items: [] }),
    taxonomyListTags: vi.fn().mockResolvedValue({ items: [] }),
    movementsGetSearchFacets: vi.fn().mockResolvedValue({ categories: [], tags: [] }),
    ...overrides,
  };
}

describe('useMovementsSearchModel', () => {
  it('loads more search results by appending the next page', async () => {
    const firstPage = searchItem({ id: 'movement-1', title: 'First' });
    const secondPage = searchItem({ id: 'movement-2', title: 'Second' });
    const movementsSearch = vi.fn((input: MovementsSearchInput) => Promise.resolve(input.pagination?.page === 1
      ? searchResult([secondPage], {
        page: 1,
        totalElements: 2,
        totalPages: 2,
        hasPrevious: true,
      })
      : searchResult([firstPage], {
        page: 0,
        totalElements: 2,
        totalPages: 2,
        hasNext: true,
      })));
    const core = makeCore({ movementsSearch });

    const { result } = renderHook(() => useMovementsSearchModel({
      core,
      accounts: [{ id: 'account-1', name: 'Checking' }],
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.state.items.map((item) => item.id)).toEqual(['movement-1']));

    act(() => {
      result.current.provided.commands.goToNextPage();
    });

    await waitFor(() => expect(result.current.required.state.items.map((item) => item.id)).toEqual([
      'movement-1',
      'movement-2',
    ]));
    expect(movementsSearch).toHaveBeenCalledWith(expect.objectContaining({
      pagination: { page: 1, size: 10 },
    }));
  });
});
