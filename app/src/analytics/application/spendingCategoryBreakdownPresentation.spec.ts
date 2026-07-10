import { describe, expect, it } from 'vitest';
import { presentSpendingCategoryBreakdown } from './spendingCategoryBreakdownPresentation';

describe('spendingCategoryBreakdownPresentation', () => {
  it('keeps the top categories visible and groups the rest into others', () => {
    const result = presentSpendingCategoryBreakdown([
      { key: 'shopping', name: 'Shopping', amountValue: '180.17', percentage: 21 },
      { key: 'food', name: 'Food', amountValue: '160.40', percentage: 19 },
      { key: 'bills', name: 'Bills', amountValue: '145.90', percentage: 17 },
      { key: 'transport', name: 'Transport', amountValue: '82.00', percentage: 10 },
      { key: 'entertainment', name: 'Entertainment', amountValue: '58.50', percentage: 7 },
      { key: 'gifts', name: 'Gifts', amountValue: '30.00', percentage: 4 },
    ], 'EUR');

    expect(result.visibleCategories.map((category) => category.name)).toEqual([
      'Shopping',
      'Food',
      'Bills',
      'Transport',
      'Others',
    ]);
    expect(result.visibleCategories[4]).toEqual(expect.objectContaining({
      name: 'Others',
      amount: '€88.50',
      percentage: 11,
    }));
    expect(result.allCategories).toHaveLength(6);
  });

  it('keeps all categories visible when there are few enough entries', () => {
    const result = presentSpendingCategoryBreakdown([
      { key: 'shopping', name: 'Shopping', amountValue: '180.17', percentage: 21 },
      { key: 'food', name: 'Food', amountValue: '160.40', percentage: 19 },
    ], 'EUR');

    expect(result.visibleCategories.map((category) => category.name)).toEqual(['Shopping', 'Food']);
    expect(result.allCategories).toHaveLength(2);
  });

  it('formats others with the selected currency instead of a hardcoded one', () => {
    const result = presentSpendingCategoryBreakdown([
      { key: 'shopping', name: 'Shopping', amountValue: '180.17', percentage: 21 },
      { key: 'food', name: 'Food', amountValue: '160.40', percentage: 19 },
      { key: 'bills', name: 'Bills', amountValue: '145.90', percentage: 17 },
      { key: 'transport', name: 'Transport', amountValue: '82.00', percentage: 10 },
      { key: 'entertainment', name: 'Entertainment', amountValue: '58.50', percentage: 7 },
      { key: 'gifts', name: 'Gifts', amountValue: '30.00', percentage: 4 },
    ], 'USD');

    expect(result.visibleCategories[4]).toEqual(expect.objectContaining({
      name: 'Others',
      amount: '$88.50',
    }));
  });
});
