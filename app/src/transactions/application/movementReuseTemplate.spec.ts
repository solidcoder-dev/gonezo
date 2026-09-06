import { describe, expect, it } from 'vitest';
import { createMovementReuseTemplate } from './movementReuseTemplate';

describe('movement reuse template', () => {
  it('keeps setup separate from optional historical details', () => {
    const template = createMovementReuseTemplate({
      title: ' Mercadona ',
      accountId: 'main',
      type: 'expense',
      categoryId: 'groceries',
      tagNames: ['food'],
      items: [{ name: 'Fruit', amount: '5.00' }, { name: 'Cleaning', amount: '2.00' }],
      sharing: { people: [{ id: 'person-1', name: 'Alex', reimbursable: true, parts: 2, amount: '7.00' }] },
      amount: '7.00',
      ignored: true,
    });
    expect(template).toMatchObject({
      note: 'Mercadona', accountId: 'main', mode: 'expense', categoryId: 'groceries',
      tagNames: ['food'], movementIgnored: true,
      splitItems: [{ name: 'Fruit', amount: '5.00' }, { name: 'Cleaning', amount: '2.00' }],
      shareDraft: { mode: 'amounts', people: [{ id: 'person-1', name: 'Alex', parts: 2, amount: '7.00' }] },
    });
    expect(template.amount).toBe('7.00');
    expect(template).not.toHaveProperty('date');
    expect(template).not.toHaveProperty('historicalMovementId');
    expect(template).not.toHaveProperty('recurrence');
    expect(template).not.toHaveProperty('exchangeRate');
  });

  it('preserves transfer account structure without monetary transfer data', () => {
    expect(createMovementReuseTemplate({
      title: 'Transfer', accountId: 'main', type: 'transfer', targetAccountId: 'savings',
    })).toEqual({
      note: 'Transfer', accountId: 'main', mode: 'transfer', tagNames: [], splitItems: [],
      transferTargetAccountId: 'savings',
    });
  });
});
