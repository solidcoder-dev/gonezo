import { describe, expect, it } from 'vitest';
import { createMovementReuseTemplate } from './movementReuseTemplate';

describe('movement reuse template', () => {
  it('keeps reusable structure and drops historical values', () => {
    const template = createMovementReuseTemplate({
      title: ' Mercadona ',
      accountId: 'main',
      type: 'expense',
      categoryId: 'groceries',
      tagNames: ['food'],
      items: [{ name: 'Fruit' }, { name: 'Cleaning' }],
      sharing: { people: [{ id: 'person-1', name: 'Alex', reimbursable: true, parts: 2 }] },
      ignored: true,
    });
    expect(template).toMatchObject({
      note: 'Mercadona', accountId: 'main', mode: 'expense', categoryId: 'groceries',
      tagNames: ['food'], movementIgnored: true,
      splitItems: [{ name: 'Fruit', amount: '' }, { name: 'Cleaning', amount: '' }],
      shareDraft: { mode: 'parts', people: [{ id: 'person-1', name: 'Alex', parts: 2, amount: '' }] },
    });
    expect(template).not.toHaveProperty('amount');
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
