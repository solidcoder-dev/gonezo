import { describe, expect, it } from 'vitest';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { WebMovementReuseSuggestionsService } from './webMovementReuseSuggestionsService';

describe('WebMovementReuseSuggestionsService template contract', () => {
  it('projects historical amount, item amounts and sharing amounts into read-model DTOs', async () => {
    const state = createWebAppState({
      ledgerAccounts: [{ id: 'main', name: 'Main', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-01-01' }],
      ledgerTransactions: [{ id: 'movement-1', accountId: 'main', type: 'expense', status: 'posted', amount: '63.00', currency: 'EUR', occurredAt: '2026-01-02', merchant: 'Mercadona', categoryId: 'cat-1', linkedTransactionId: undefined, items: [{ id: 'item-1', name: 'Food', amount: '40.00', currency: 'EUR' }, { id: 'item-2', name: 'Drinks', amount: '23.00', currency: 'EUR' }] }],
      taxonomyCategories: [{ id: 'cat-1', name: 'Groceries', normalizedName: 'groceries', appliesTo: 'expense', status: 'active', createdAt: '2026-01-01' }],
      taxonomyTags: [{ id: 'tag-1', name: 'Food', normalizedName: 'food', status: 'active', createdAt: '2026-01-01' }],
      taxonomyTransactionTags: new Map([['movement-1', ['tag-1']]]),
      analyticsExclusions: [{ id: 'exclusion-1', scopeType: 'movement', scopeId: 'movement-1', reason: 'user_ignored', createdAt: '2026-01-03' }],
      sharingPersons: [{ id: 'alice', name: 'Alice', normalizedName: 'alice', createdAt: '2026-01-01' }, { id: 'bob', name: 'Bob', normalizedName: 'bob', createdAt: '2026-01-01' }],
      expenseShares: [{ id: 'share-1', transactionId: 'movement-1', payerPersonId: 'alice', totalAmount: '63.00', currency: 'EUR', participants: [{ participantId: 'p-1', personId: 'alice', amount: '30.00', reimbursable: true }, { participantId: 'p-2', personId: 'bob', amount: '33.00', reimbursable: false }], createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
    });

    const template = await new WebMovementReuseSuggestionsService(state).movementReuseGetTemplate({ representativeMovementId: 'movement-1' });

    expect(template).toMatchObject({ title: 'Mercadona', accountId: 'main', category: { id: 'cat-1', name: 'Groceries' }, tags: [{ id: 'tag-1', name: 'Food' }], ignored: true });
    expect(template.details).toEqual({ amount: '63.00', items: [{ name: 'Food', amount: '40.00' }, { name: 'Drinks', amount: '23.00' }], sharing: [{ person: 'Alice', amount: '30.00', reimbursable: true }, { person: 'Bob', amount: '33.00', reimbursable: false }] });
  });

  it('does not require details when historical movement has no items or sharing', async () => {
    const state = createWebAppState({ ledgerTransactions: [{ id: 'movement-1', accountId: 'main', type: 'expense', status: 'posted', amount: '25.00', currency: 'EUR', occurredAt: '2026-01-02', merchant: 'Plain', items: [] }] });
    const template = await new WebMovementReuseSuggestionsService(state).movementReuseGetTemplate({ representativeMovementId: 'movement-1' });
    expect(template.details).toBeUndefined();
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
