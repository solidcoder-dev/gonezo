import { describe, expect, it } from 'vitest';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomyCore.port';
import {
  findActiveCategoryByName,
  mergeCategories,
  parseTransactionTagInput,
  resolveKnownTagSelectionIds,
} from './transactionTaxonomySelection';

const food: TaxonomyCategoryItem = {
  id: 'cat-1',
  name: 'Food',
  appliesTo: 'expense',
  status: 'active',
};

describe('transactionTaxonomySelection', () => {
  it('finds and merges categories by scope and normalized name', () => {
    const incoming: TaxonomyCategoryItem = {
      id: 'cat-2',
      name: 'food',
      appliesTo: 'expense',
      status: 'active',
    };
    const salary: TaxonomyCategoryItem = {
      id: 'cat-3',
      name: 'Salary',
      appliesTo: 'income',
      status: 'active',
    };

    expect(findActiveCategoryByName([food], 'expense', 'food')).toEqual(food);
    expect(findActiveCategoryByName([{ ...food, status: 'archived' }], 'expense', 'food')).toBeUndefined();
    expect(mergeCategories([food], [incoming, salary])).toEqual([incoming, salary]);
  });

  it('parses tag input and resolves only active known tag ids', () => {
    const tags: TaxonomyTagItem[] = [
      { id: 'tag-1', name: 'Travel', status: 'active' },
      { id: 'tag-2', name: 'Hidden', status: 'archived' },
    ];

    expect(parseTransactionTagInput(' Travel, travel, Work, ,TRAVEL ')).toEqual(['Travel', 'Work']);
    expect(resolveKnownTagSelectionIds(['travel', 'hidden', 'missing', 'Travel'], tags)).toEqual(['tag-1']);
  });
});
