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

    expect(result.current.state.categoryOptions.map((category) => category.id)).toContain('expense:groceries');
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
      result.current.actions.setTransactionCategoryId('expense:bills');
    });

    await expect(result.current.actions.resolveCategorySelection('expense')).resolves.toBe('expense:bills');
    expect(taxonomy.taxonomyCreateCategory).not.toHaveBeenCalled();
  });
});
