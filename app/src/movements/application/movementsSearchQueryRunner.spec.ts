import { describe, expect, it, vi } from 'vitest';
import type {
  MovementsSearchItem,
  MovementsSearchResult,
  OrchestrationListTransactionTaxonomyInput,
} from '../../shared/domain/corePort';
import type { MovementsSearchFiltersState } from '../domain/movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';
import { runMovementsSearchQuery, type MovementsSearchQueryRunnerInput } from './movementsSearchQueryRunner';
import type { PostedTaxonomySearchPort } from './postedTaxonomySearch';

function filters(overrides: Partial<MovementsSearchFiltersState> = {}): MovementsSearchFiltersState {
  return {
    ...createDefaultMovementsSearchFilters(),
    ...overrides,
  };
}

function movement(overrides: Partial<MovementsSearchItem> = {}): MovementsSearchItem {
  return {
    id: 'tx-1',
    source: 'posted',
    type: 'expense',
    status: 'posted',
    amount: '10.00',
    currency: 'EUR',
    occurredAt: '2026-05-01T10:00:00.000Z',
    title: 'Movement',
    ...overrides,
  };
}

function page(
  content: MovementsSearchItem[],
  overrides: Partial<MovementsSearchResult> = {},
): MovementsSearchResult {
  return {
    content,
    page: 0,
    size: content.length,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    hasNext: false,
    hasPrevious: false,
    ...overrides,
  };
}

function makeCore(overrides: Partial<PostedTaxonomySearchPort> = {}): PostedTaxonomySearchPort {
  return {
    movementsSearch: vi.fn(async () => page([])),
    orchestrationListTransactionTaxonomy: vi.fn(async ({ transactionIds }: OrchestrationListTransactionTaxonomyInput) => ({
      items: transactionIds.map((transactionId) => ({
        transactionId,
        categorizationStatus: 'none' as const,
        taggingStatus: 'none' as const,
      })),
    })),
    taxonomyListCategories: vi.fn(async () => ({ items: [] })),
    taxonomyListTags: vi.fn(async () => ({ items: [] })),
    ...overrides,
  };
}

function input(
  core: PostedTaxonomySearchPort,
  overrides: Partial<MovementsSearchQueryRunnerInput> = {},
): MovementsSearchQueryRunnerInput {
  return {
    core,
    accountScope: [{ id: 'acc-1', name: 'Main' }],
    accountId: 'acc-1',
    filters: filters(),
    page: 0,
    ...overrides,
  };
}

describe('runMovementsSearchQuery', () => {
  it('uses the selected-account core search strategy with normalized filters and account context', async () => {
    const core = makeCore({
      movementsSearch: vi.fn(async (searchInput) => page(
        [movement({ id: 'tx-1', title: 'Coffee' })],
        {
          page: searchInput.pagination?.page ?? 0,
          size: searchInput.pagination?.size ?? 10,
          totalElements: 1,
          totalPages: 1,
        },
      )),
    });

    const result = await runMovementsSearchQuery(input(core, {
      filters: filters({ amountMin: '20', amountMax: '10' }),
      page: 2,
    }));

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'tx-1',
        title: 'Coffee',
        accountId: 'acc-1',
        accountName: 'Main',
      }),
    ]);
    expect(result.pagination.page).toBe(2);
    expect(core.movementsSearch).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      pagination: { page: 2, size: 10 },
      filters: expect.objectContaining({
        amountMin: '10',
        amountMax: '20',
      }),
    }));
  });

  it('aggregates every account through collection pages before sorting and paginating', async () => {
    const core = makeCore({
      movementsSearch: vi.fn(async (searchInput) => {
        if (searchInput.accountId === 'acc-1' && searchInput.pagination?.page === 0) {
          return page(
            [
              movement({ id: 'old', occurredAt: '2026-05-01T10:00:00.000Z' }),
              movement({ id: 'old', occurredAt: '2026-05-01T10:00:00.000Z' }),
            ],
            { page: 0, size: 100, hasNext: true, totalElements: 3, totalPages: 2 },
          );
        }
        if (searchInput.accountId === 'acc-1') {
          return page(
            [movement({ id: 'new', occurredAt: '2026-05-03T10:00:00.000Z' })],
            { page: 1, size: 100, hasNext: false, totalElements: 3, totalPages: 2 },
          );
        }
        return page(
          [movement({ id: 'middle', occurredAt: '2026-05-02T10:00:00.000Z' })],
          { page: 0, size: 100, totalElements: 1, totalPages: 1 },
        );
      }),
    });

    const result = await runMovementsSearchQuery(input(core, {
      accountScope: [
        { id: 'acc-1', name: 'Main' },
        { id: 'acc-2', name: 'Savings' },
      ],
      accountId: null,
      filters: filters({ pageSize: 2 }),
    }));

    expect(result.items.map((item) => `${item.accountName}:${item.id}`)).toEqual(['Main:new', 'Savings:middle']);
    expect(result.pagination).toMatchObject({
      totalElements: 3,
      totalPages: 2,
      hasNext: true,
    });
    expect(core.movementsSearch).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      pagination: { page: 0, size: 100 },
    }));
    expect(core.movementsSearch).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      pagination: { page: 1, size: 100 },
    }));
    expect(core.movementsSearch).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-2',
      pagination: { page: 0, size: 100 },
    }));
  });

  it('uses the posted taxonomy strategy without sending taxonomy ids to the candidate search', async () => {
    const core = makeCore({
      movementsSearch: vi.fn(async () => page([
        movement({ id: 'food' }),
        movement({ id: 'other' }),
      ])),
      orchestrationListTransactionTaxonomy: vi.fn(async () => ({
        items: [
          {
            transactionId: 'food',
            categoryId: 'cat-food',
            tagIds: [],
            categorizationStatus: 'assigned' as const,
            taggingStatus: 'none' as const,
          },
          {
            transactionId: 'other',
            tagIds: [],
            categorizationStatus: 'none' as const,
            taggingStatus: 'none' as const,
          },
        ],
      })),
      taxonomyListCategories: vi.fn(async () => ({
        items: [{ id: 'cat-food', name: 'Food', appliesTo: 'expense' as const, status: 'active' as const }],
      })),
    });

    const result = await runMovementsSearchQuery(input(core, {
      filters: filters({ categoryIds: ['cat-food'] }),
    }));

    expect(result.items.map((item) => item.id)).toEqual(['food']);
    expect(result.items[0]).toMatchObject({
      accountId: 'acc-1',
      accountName: 'Main',
      category: { id: 'cat-food', name: 'Food' },
    });
    const searchInput = vi.mocked(core.movementsSearch).mock.calls[0]?.[0];
    expect(searchInput?.pagination).toEqual({ page: 0, size: 100 });
    expect(searchInput?.filters).not.toHaveProperty('categoryId');
    expect(searchInput?.filters).not.toHaveProperty('categoryIds');
  });

  it('returns an empty page without touching the core when there is no account scope', async () => {
    const core = makeCore();

    const result = await runMovementsSearchQuery(input(core, {
      accountScope: [],
      accountId: null,
    }));

    expect(result.items).toEqual([]);
    expect(result.pagination.totalElements).toBe(0);
    expect(core.movementsSearch).not.toHaveBeenCalled();
  });
});
