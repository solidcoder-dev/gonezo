import { describe, expect, it, vi } from 'vitest';
import {
  calculateSplitRemaining,
  cloneSplitItems,
  createRemainingSplitItem,
  sumSplitItems,
  upsertSplitItem,
} from './transactionSplitItems';

describe('transaction split item helpers', () => {
  it('clones incoming split items with generated ids', () => {
    const nextId = vi.fn()
      .mockReturnValueOnce('split-a')
      .mockReturnValueOnce('split-b');

    expect(cloneSplitItems([
      { id: 'source-a', name: 'Food', amount: '10.00' },
      { id: 'source-b', name: 'Drink', amount: '20.00' },
    ], nextId)).toEqual([
      { id: 'split-a', name: 'Food', amount: '10.00' },
      { id: 'split-b', name: 'Drink', amount: '20.00' },
    ]);
  });

  it('adds or edits split items with normalized amounts', () => {
    const added = upsertSplitItem({
      items: [],
      editingItemId: '',
      nameInput: 'Food',
      amountInput: '12',
      nextId: () => 'new-id',
    });

    expect(added.errors).toEqual({});
    expect(added.items).toEqual([{ id: 'new-id', name: 'Food', amount: '12.00' }]);

    const edited = upsertSplitItem({
      items: added.items,
      editingItemId: 'new-id',
      nameInput: 'Groceries',
      amountInput: '15.5',
      nextId: () => 'unused',
    });

    expect(edited.errors).toEqual({});
    expect(edited.items).toEqual([{ id: 'new-id', name: 'Groceries', amount: '15.50' }]);
  });

  it('keeps existing validation messages for invalid split items', () => {
    expect(upsertSplitItem({
      items: [],
      editingItemId: '',
      nameInput: ' ',
      amountInput: '0',
      nextId: () => 'unused',
    })).toEqual({
      items: [],
      errors: {
        expenseItemName: 'Item name is required.',
        expenseItemAmount: 'Item amount must be greater than 0.',
      },
    });
  });

  it('calculates totals and remaining split amount', () => {
    const items = [
      { id: 'a', name: 'Food', amount: '10.00' },
      { id: 'b', name: 'Drink', amount: '2.505' },
    ];

    expect(sumSplitItems(items)).toBe(12.504999999999999);
    expect(calculateSplitRemaining('20', items)).toBe('7.50');
  });

  it('creates a remaining split item with a fallback name', () => {
    expect(createRemainingSplitItem({
      itemsLength: 1,
      remaining: '7.5',
      nameInput: '',
      nextId: () => 'remaining-id',
    })).toEqual({
      id: 'remaining-id',
      name: 'Item 2',
      amount: '7.50',
    });
  });
});
