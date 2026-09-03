import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaxonomyListCategoriesResult } from '../../taxonomy/application/taxonomy.port';
import type { CoreAdapterWeb } from './coreAdapterWeb';

const { isNativeRuntime, taxonomyListCategories, taxonomyCreateCategory } = vi.hoisted(() => ({
  isNativeRuntime: vi.fn(),
  taxonomyListCategories: vi.fn(),
  taxonomyCreateCategory: vi.fn(),
}));

vi.mock('./runtimeAdapterSupport', () => ({
  isNativeRuntime,
}));

vi.mock('./corePlugin', () => ({
  CorePlugin: {
    taxonomyListCategories,
    taxonomyCreateCategory,
  },
}));

import { TaxonomyRuntimeAdapter } from './taxonomyRuntimeAdapter';

describe('TaxonomyRuntimeAdapter', () => {
  beforeEach(() => {
    isNativeRuntime.mockReset();
    taxonomyListCategories.mockReset();
    taxonomyCreateCategory.mockReset();
    isNativeRuntime.mockReturnValue(true);
  });

  it('returns persisted native categories including Services', async () => {
    const result: TaxonomyListCategoriesResult = {
      items: [
        { id: 'services-id', name: 'Services', appliesTo: 'expense', status: 'active', usageCount: 0 },
      ],
    };
    taxonomyListCategories.mockResolvedValue(result);
    const adapter = new TaxonomyRuntimeAdapter({} as CoreAdapterWeb);

    await expect(adapter.taxonomyListCategories({ appliesTo: 'expense' })).resolves.toEqual(result);
    expect(taxonomyListCategories).toHaveBeenCalledWith({ appliesTo: 'expense' });
  });

  it('does not create categories while listing persisted native categories', async () => {
    taxonomyListCategories.mockResolvedValue({
      items: [
        { id: 'unknown-id', name: 'User category', appliesTo: 'expense', status: 'active', usageCount: 2 },
      ],
    });
    const adapter = new TaxonomyRuntimeAdapter({} as CoreAdapterWeb);

    await expect(adapter.taxonomyListCategories()).resolves.toEqual({
      items: [
        { id: 'unknown-id', name: 'User category', appliesTo: 'expense', status: 'active', usageCount: 2 },
      ],
    });
    expect(taxonomyCreateCategory).not.toHaveBeenCalled();
  });
});
