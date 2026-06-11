import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionTaxonomyModel } from './useTransactionTaxonomyModel';

function makeTaxonomy(): TaxonomyGatewayPort {
  return {
    taxonomyListCategories: vi.fn(async () => ({
      items: [
        { id: 'cat-custom', name: 'Custom', appliesTo: 'expense' as const, status: 'active' as const },
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
        },
      ],
    })),
  };
}

describe('useTransactionTaxonomyModel', () => {
  it('uses master categories as selectable options instead of custom backend categories', async () => {
    const taxonomy = makeTaxonomy();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.refreshLookups();
    });

    expect(result.current.state.categoryOptions.map((category) => category.id)).toContain('00000000-0000-4000-8000-000000000102');
    expect(result.current.state.categoryOptions.map((category) => category.id)).not.toContain('cat-custom');
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
    act(() => {
      result.current.actions.setTransactionCategoryId('00000000-0000-4000-8000-000000000101');
    });

    await expect(result.current.actions.resolveCategorySelection('expense')).resolves.toBe('00000000-0000-4000-8000-000000000101');
    expect(taxonomy.taxonomyCreateCategory).not.toHaveBeenCalled();
  });

  it('does not orchestrate master category assignments', async () => {
    const taxonomy = makeTaxonomy();
    const { result } = renderHook(() => useTransactionTaxonomyModel({
      taxonomy,
      composerMode: 'expense',
    }));

    await act(async () => {
      await result.current.actions.categorizeTransaction(
        'tx-1',
        'expense',
        '00000000-0000-4000-8000-000000000102',
      );
    });

    expect(taxonomy.orchestrationCategorizeTransaction).not.toHaveBeenCalled();
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
});
