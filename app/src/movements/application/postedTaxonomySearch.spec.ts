import { describe, expect, it, vi } from 'vitest';
import type { MovementsSearchItem, MovementsSearchResult } from './movementsCore.port';
import { buildPostedTaxonomySearchPage, type PostedTaxonomySearchPort } from './postedTaxonomySearch';

function movement(id: string, categoryId: string): MovementsSearchItem {
  return {
    id,
    source: 'posted',
    type: 'expense',
    status: 'posted',
    amount: '1.00',
    currency: 'EUR',
    occurredAt: '2026-05-01T00:00:00.000Z',
    title: id,
    categoryId,
    tags: [],
    items: [],
  };
}

function page(content: MovementsSearchItem[], pageIndex: number, hasNext: boolean): MovementsSearchResult {
  return {
    content,
    page: pageIndex,
    size: 100,
    totalElements: 130,
    totalPages: 2,
    hasNext,
    hasPrevious: pageIndex > 0,
  };
}

describe('postedTaxonomySearch', () => {
  it('collects all posted pages before applying taxonomy filters', async () => {
    const firstPageItems = Array.from({ length: 100 }).map((_, index) => movement(`non-match-${index}`, 'cat-other'));
    const secondPageItems = Array.from({ length: 30 }).map((_, index) => movement(`match-${index}`, 'cat-food'));
    const core: PostedTaxonomySearchPort = {
      movementsSearch: vi.fn(async (input) => (input.pagination?.page === 0
        ? page(firstPageItems, 0, true)
        : page(secondPageItems, 1, false))),
      orchestrationListTransactionTaxonomy: vi.fn(async ({ transactionIds }: { transactionIds: string[] }) => ({
        items: transactionIds.map((transactionId) => ({
          transactionId,
          categoryId: transactionId.startsWith('match-') ? 'cat-food' : 'cat-other',
          tagIds: [],
        })),
      })),
      taxonomyListCategories: vi.fn(async () => ({
        items: [
          { id: 'cat-food', name: 'Food', appliesTo: 'expense' as const, status: 'active' as const },
          { id: 'cat-other', name: 'Other', appliesTo: 'expense' as const, status: 'active' as const },
        ],
      })),
      taxonomyListTags: vi.fn(async () => ({ items: [] })),
    };

    const result = await buildPostedTaxonomySearchPage({
      core,
      accountId: 'account-1',
      filters: {
        source: 'posted',
        text: '',
        merchant: '',
        categoryIds: ['cat-food'],
        tagIds: [],
        amountMin: '',
        amountMax: '',
        fromDate: '',
        toDate: '',
        types: [],
        sortField: 'date',
        sortDirection: 'desc',
        pageSize: 10,
        groupByDay: true,
      },
      page: 0,
    });

    expect(result.items).toHaveLength(10);
    expect(result.items[0]?.id).toBe('match-0');
    expect(result.pagination.totalElements).toBe(30);
    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNext).toBe(true);
    expect(core.movementsSearch).toHaveBeenCalledTimes(2);
  });
});
