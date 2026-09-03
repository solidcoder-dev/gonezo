import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionTaxonomyModel } from './useTransactionTaxonomyModel';

function makeTaxonomy(): TaxonomyGatewayPort {
  return {
    taxonomyListCategories: vi.fn(async () => ({
      items: [
        { id: 'cat-custom', name: 'Custom', appliesTo: 'expense' as const, status: 'active' as const, usageCount: 3 },
      ],
    })),
    taxonomyCreateCategory: vi.fn(async () => ({ id: 'cat-created' })),
    taxonomyRenameCategory: vi.fn(async () => undefined),
    taxonomyListTags: vi.fn(async () => ({ items: [] })),
    taxonomyRenameTag: vi.fn(async () => undefined),
    orchestrationCategorizeTransaction: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationApplyTransactionTags: vi.fn(async () => ({ status: 'assigned' as const })),
    orchestrationListTransactionTaxonomy: vi.fn(async () => ({ items: [] })),
  };
}

function makeTaxonomyWithNativeMasterCategory(): TaxonomyGatewayPort {
  return {
    ...makeTaxonomy(),
    taxonomyListCategories: vi.fn(async () => ({
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Groceries',
          appliesTo: 'expense' as const,
          status: 'active' as const,
          usageCount: 9,
        },
      ],
    })),
  };
}

describe('useTransactionTaxonomyModel', () => {
  it('uses runtime taxonomy categories as selectable options', async () => {
    const taxonomy = makeTaxonomy();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.refreshLookups();
    });

    expect(result.current.state.categoryOptions).toEqual([{ id: 'cat-custom', name: 'Custom' }]);
  });

  it('does not create categories while resolving selection', async () => {
    const taxonomy = makeTaxonomy();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.refreshLookups();
    });
    act(() => result.current.actions.setTransactionCategoryId('cat-custom'));

    await expect(result.current.actions.resolveCategorySelection('expense')).resolves.toBe('cat-custom');
    expect(taxonomy.taxonomyCreateCategory).not.toHaveBeenCalled();
  });

  it('orchestrates runtime category assignments', async () => {
    const taxonomy = makeTaxonomy();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.categorizeTransaction(
        'tx-1',
        'expense',
        'cat-custom',
      );
    });

    expect(taxonomy.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      transactionType: 'expense',
      categoryId: 'cat-custom',
    });
  });

  it('uses backend ids for native-seeded master categories', async () => {
    const taxonomy = makeTaxonomyWithNativeMasterCategory();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.refreshLookups();
    });

    expect(result.current.state.categoryOptions).toContainEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Groceries',
    });
    expect(result.current.state.categoryOptions.map((category) => category.id))
      .not.toContain('00000000-0000-4000-8000-000000000102');
  });

  it('orchestrates backend master category ids', async () => {
    const taxonomy = makeTaxonomyWithNativeMasterCategory();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.categorizeTransaction(
        'tx-1',
        'expense',
        '11111111-1111-4111-8111-111111111111',
      );
    });

    expect(taxonomy.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      transactionType: 'expense',
      categoryId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('orders runtime categories by usage count and deterministic fallback keys', async () => {
    const taxonomy: TaxonomyGatewayPort = {
      ...makeTaxonomy(),
      taxonomyListCategories: vi.fn(async () => ({
        items: [
          { id: 'cat-groceries', name: 'Groceries', appliesTo: 'expense' as const, status: 'active' as const, usageCount: 5 },
          { id: 'cat-dining', name: 'Dining', appliesTo: 'expense' as const, status: 'active' as const, usageCount: 2 },
          { id: 'cat-other', name: 'Other', appliesTo: 'expense' as const, status: 'active' as const, usageCount: 0 },
        ],
      })),
    };
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.refreshLookups();
    });

    expect(result.current.state.categoryOptions).toEqual([
      { id: 'cat-groceries', name: 'Groceries' },
      { id: 'cat-dining', name: 'Dining' },
      { id: 'cat-other', name: 'Other' },
    ]);
  });
});
