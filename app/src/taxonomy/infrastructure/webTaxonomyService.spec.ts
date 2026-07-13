import { describe, expect, it, vi } from 'vitest';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import { createWebAppState, type WebAppState } from '../../core/infrastructure/webAppState';
import { WebTaxonomyService } from './webTaxonomyService';

function createDependencies(): WebRuntimeDependencies {
  let next = 0;
  return {
    clock: {
      nowIso: () => '2026-05-26T09:00:00.000Z',
    },
    idGenerator: {
      nextId: () => {
        next += 1;
        return `id-${next}`;
      },
    },
    backupDownloader: {
      downloadJson: vi.fn(),
    },
  };
}

function createSubject(state: WebAppState = createWebAppState()) {
  return new WebTaxonomyService({
    state,
    dependencies: createDependencies(),
  });
}

describe('WebTaxonomyService', () => {
  it('lists categories and tags while respecting archived filters and sort order', async () => {
    const taxonomy = createSubject(createWebAppState({
      ledgerTransactions: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '10.00',
          currency: 'EUR',
          occurredAt: '2026-05-01T00:00:00.000Z',
          categoryId: '00000000-0000-4000-8000-000000000102',
          items: [],
        },
        {
          id: 'tx-2',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '12.00',
          currency: 'EUR',
          occurredAt: '2026-05-02T00:00:00.000Z',
          categoryId: '00000000-0000-4000-8000-000000000102',
          items: [],
        },
        {
          id: 'tx-3',
          accountId: 'acc-1',
          type: 'expense',
          status: 'voided',
          amount: '8.00',
          currency: 'EUR',
          occurredAt: '2026-05-03T00:00:00.000Z',
          categoryId: '00000000-0000-4000-8000-000000000110',
          items: [],
        },
      ],
      taxonomyCategories: [
        {
          id: 'cat-z',
          name: 'Zed',
          normalizedName: 'zed',
          appliesTo: 'expense',
          status: 'archived',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cat-a',
          name: 'Alpha',
          normalizedName: 'alpha',
          appliesTo: 'income',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      taxonomyTags: [
        {
          id: 'tag-z',
          name: 'zed',
          normalizedName: 'zed',
          status: 'archived',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'tag-a',
          name: 'alpha',
          normalizedName: 'alpha',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    }));

    const expenseCategories = await taxonomy.listCategories({ appliesTo: 'expense' });
    expect(expenseCategories.items.slice(0, 4)).toEqual([
      { id: '00000000-0000-4000-8000-000000000102', name: 'Groceries', appliesTo: 'expense', status: 'active', usageCount: 2 },
      { id: '00000000-0000-4000-8000-000000000110', name: 'Beauty', appliesTo: 'expense', status: 'active', usageCount: 0 },
      { id: '00000000-0000-4000-8000-000000000101', name: 'Bills', appliesTo: 'expense', status: 'active', usageCount: 0 },
      { id: '00000000-0000-4000-8000-000000000103', name: 'Dining', appliesTo: 'expense', status: 'active', usageCount: 0 },
    ]);
    await expect(taxonomy.listCategories({ appliesTo: 'income' })).resolves.toMatchObject({
      items: expect.arrayContaining([
        { id: '00000000-0000-4000-8000-000000000201', name: 'Work Income', appliesTo: 'income', status: 'active', usageCount: 0 },
      ]),
    });
    await expect(taxonomy.listTags()).resolves.toEqual({
      items: [
        { id: 'tag-a', name: 'alpha', status: 'active' },
      ],
    });
  });

  it('blocks category creation and renaming because categories are master data', async () => {
    const taxonomy = createSubject();

    await expect(taxonomy.createCategory({ name: ' Food ', appliesTo: 'expense' })).rejects.toThrow('master data');
    await expect(taxonomy.renameCategory({ categoryId: '00000000-0000-4000-8000-000000000101', name: 'Housing' })).rejects.toThrow('master data');

    await expect(taxonomy.applyTransactionTags({
      transactionId: 'tx-missing',
      tagNames: ['Home', 'home', ' Travel '],
    })).rejects.toThrow('Transaction not found');
  });

  it('categorizes transactions with assignment and failure results', async () => {
    const taxonomy = createSubject(createWebAppState({
      ledgerTransactions: [
        {
          id: 'tx-expense',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '10.00',
          currency: 'EUR',
          occurredAt: '2026-05-01T00:00:00.000Z',
          items: [],
        },
        {
          id: 'tx-transfer',
          accountId: 'acc-1',
          type: 'transfer',
          status: 'posted',
          amount: '10.00',
          currency: 'EUR',
          occurredAt: '2026-05-01T00:00:00.000Z',
          items: [],
        },
      ],
      taxonomyCategories: [
        {
          id: 'cat-food',
          name: 'Food',
          normalizedName: 'food',
          appliesTo: 'expense',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cat-salary',
          name: 'Salary',
          normalizedName: 'salary',
          appliesTo: 'income',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cat-old',
          name: 'Old',
          normalizedName: 'old',
          appliesTo: 'expense',
          status: 'archived',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    }));

    await expect(taxonomy.categorizeTransaction({
      transactionId: 'tx-expense',
      transactionType: 'expense',
      categoryId: 'cat-food',
    })).resolves.toEqual({ status: 'assigned', categoryId: 'cat-food' });

    await expect(taxonomy.categorizeTransaction({
      transactionId: 'tx-expense',
      transactionType: 'expense',
      categoryId: 'missing',
    })).resolves.toMatchObject({ status: 'failed', errorCode: 'CATEGORY_NOT_FOUND' });
    await expect(taxonomy.categorizeTransaction({
      transactionId: 'tx-expense',
      transactionType: 'expense',
      categoryId: 'cat-old',
    })).resolves.toMatchObject({ status: 'failed', errorCode: 'CATEGORY_ARCHIVED' });
    await expect(taxonomy.categorizeTransaction({
      transactionId: 'tx-expense',
      transactionType: 'expense',
      categoryId: 'cat-salary',
    })).resolves.toMatchObject({ status: 'failed', errorCode: 'CATEGORY_APPLIES_TO_MISMATCH' });
    await expect(taxonomy.categorizeTransaction({
      transactionId: 'tx-transfer',
      transactionType: 'transfer' as 'expense',
      categoryId: 'cat-food',
    })).rejects.toThrow('Only income/expense transactions can be categorized');
  });

  it('deduplicates and creates tags before listing transaction taxonomy', async () => {
    const state = createWebAppState({
      ledgerTransactions: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '10.00',
          currency: 'EUR',
          occurredAt: '2026-05-01T00:00:00.000Z',
          items: [],
        },
      ],
      taxonomyTags: [
        {
          id: 'tag-old',
          name: 'old',
          normalizedName: 'old',
          status: 'archived',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    });
    const taxonomy = createSubject(state);

    await expect(taxonomy.applyTransactionTags({
      transactionId: 'tx-1',
      tagNames: ['Home', 'home', ' Travel '],
    })).resolves.toEqual({
      status: 'assigned',
      tagIds: ['id-1', 'id-2'],
    });
    await expect(taxonomy.applyTransactionTags({
      transactionId: 'tx-1',
      tagNames: ['old'],
    })).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'TAG_ARCHIVED',
    });

    await expect(taxonomy.listTransactionTaxonomy({ transactionIds: ['tx-1', 'tx-1', ' '] })).resolves.toEqual({
      items: [
        {
          transactionId: 'tx-1',
          categoryId: undefined,
          tagIds: ['id-1', 'id-2'],
          categorizationStatus: 'none',
          taggingStatus: 'assigned',
        },
      ],
    });
  });
});
