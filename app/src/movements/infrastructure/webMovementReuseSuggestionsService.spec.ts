import { describe, expect, it } from 'vitest';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { WebMovementReuseSuggestionsService } from './webMovementReuseSuggestionsService';

describe('WebMovementReuseSuggestionsService template contract', () => {
  it('returns semantic taxonomy names and reusable structure without historical values', async () => {
    const state = createWebAppState({
      ledgerAccounts: [{ id: 'main', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01' }],
      ledgerTransactions: [{ id: 'movement-1', accountId: 'main', type: 'expense', status: 'posted', amount: '25.00', currency: 'EUR', occurredAt: '2026-01-02', merchant: 'Mercadona', categoryId: 'cat-1', linkedTransactionId: undefined, items: [{ id: 'item-1', name: 'Fruit', amount: '5.00', currency: 'EUR' }] }],
      taxonomyCategories: [{ id: 'cat-1', name: 'Groceries', normalizedName: 'groceries', appliesTo: 'expense', status: 'active', createdAt: '2026-01-01' }],
      taxonomyTags: [{ id: 'tag-1', name: 'Food', normalizedName: 'food', status: 'active', createdAt: '2026-01-01' }],
      taxonomyTransactionTags: new Map([['movement-1', ['tag-1']]]),
      analyticsExclusions: [{ id: 'exclusion-1', scopeType: 'movement', scopeId: 'movement-1', reason: 'user_ignored', createdAt: '2026-01-03' }],
    });

    const template = await new WebMovementReuseSuggestionsService(state).movementReuseGetTemplate({ representativeMovementId: 'movement-1' });

    expect(template).toMatchObject({ title: 'Mercadona', accountId: 'main', category: { id: 'cat-1', name: 'Groceries' }, tags: [{ id: 'tag-1', name: 'Food' }], itemNames: ['Fruit'], ignored: true });
    expect(template).not.toHaveProperty('amount');
    expect(template).not.toHaveProperty('occurredAt');
  });

  it('drops archived taxonomy from the applicable template', async () => {
    const state = createWebAppState({
      ledgerTransactions: [{ id: 'movement-1', accountId: 'main', type: 'expense', status: 'posted', amount: '1.00', currency: 'EUR', occurredAt: '2026-01-02', merchant: 'Old', categoryId: 'cat-1', items: [] }],
      taxonomyCategories: [{ id: 'cat-1', name: 'Old', normalizedName: 'old', appliesTo: 'expense', status: 'archived', createdAt: '2026-01-01' }],
      taxonomyTags: [{ id: 'tag-1', name: 'Old tag', normalizedName: 'old-tag', status: 'archived', createdAt: '2026-01-01' }],
      taxonomyTransactionTags: new Map([['movement-1', ['tag-1']]]),
    });

    const template = await new WebMovementReuseSuggestionsService(state).movementReuseGetTemplate({ representativeMovementId: 'movement-1' });

    expect(template.category).toBeUndefined();
    expect(template.tags).toEqual([]);
  });
});
