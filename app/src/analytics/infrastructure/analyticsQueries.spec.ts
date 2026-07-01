import { describe, expect, it, vi } from 'vitest';
import type {
  LedgerAccountItem,
  LedgerListTransactionsInput,
  LedgerTransactionListItem,
} from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import {
  analyticsGetCashFlowSeries,
  analyticsGetFilterFacets,
  analyticsGetPeriodCashFlowSummary,
  analyticsGetSpendingOverview,
} from './analyticsQueries';

function transaction(input: Partial<LedgerTransactionListItem> & Pick<LedgerTransactionListItem, 'id' | 'type' | 'amount'>): LedgerTransactionListItem {
  return {
    accountId: 'acc-1',
    status: 'posted',
    currency: 'EUR',
    occurredAt: '2026-06-15T12:00:00.000Z',
    items: [],
    ...input,
  };
}

function createPort(transactions: LedgerTransactionListItem[]) {
  const accounts: LedgerAccountItem[] = [
    { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
  ];
  const categories: TaxonomyCategoryItem[] = [
    { id: 'cat-food', name: 'Food', appliesTo: 'expense', status: 'active' },
  ];
  return {
    preferencesGet: vi.fn(async () => ({ defaultAccountId: 'acc-1' })),
    ledgerListAccounts: vi.fn(async () => ({ items: accounts })),
    ledgerListTransactions: vi.fn(async (input: LedgerListTransactionsInput) => ({
      content: input.filters?.tagIds && input.filters.tagIds.length > 0
        ? transactions.filter((item) => item.tags?.some((tag) => input.filters?.tagIds?.includes(tag.id)))
        : transactions,
      page: 0,
      size: transactions.length,
      totalElements: transactions.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    })),
    taxonomyListCategories: vi.fn(async () => ({ items: categories })),
    taxonomyListTags: vi.fn(async () => ({ items: [
      { id: 'tag-trip', name: 'Alicante 2026', status: 'active' as const },
      { id: 'tag-home', name: 'Home Renovation', status: 'active' as const },
    ] })),
    orchestrationListTransactionTaxonomy: vi.fn(async (input: { transactionIds: string[] }) => ({
      items: input.transactionIds.map((transactionId) => ({
        transactionId,
        tagIds: transactions.find((item) => item.id === transactionId)?.tags?.map((tag) => tag.id) ?? [],
      })),
    })),
  };
}

describe('analytics queries', () => {
  it('excludes ignored movements from analytics summaries, series and spending', async () => {
    const port = createPort([
      transaction({ id: 'income-kept', type: 'income', amount: '100.00' }),
      transaction({ id: 'income-ignored', type: 'income', amount: '40.00', ignored: true }),
      transaction({ id: 'expense-kept', type: 'expense', amount: '25.00', categoryId: 'cat-food' }),
      transaction({ id: 'expense-ignored', type: 'expense', amount: '10.00', categoryId: 'cat-food', ignored: true }),
    ]);

    await expect(analyticsGetPeriodCashFlowSummary(port, { currency: 'EUR' })).resolves.toEqual({
      incomeAmount: '100.00',
      expenseAmount: '25.00',
      netFlowAmount: '75.00',
    });
    await expect(analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
    })).resolves.toMatchObject({
      totals: {
        incomeAmount: '100.00',
        expenseAmount: '25.00',
      },
    });
    await expect(analyticsGetSpendingOverview(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
    })).resolves.toMatchObject({
      totalExpenseAmount: '25.00',
      categories: [{ categoryId: 'cat-food', categoryName: 'Food', amount: '25.00', percentage: 100 }],
    });
  });

  it('scopes analytics tag facets to posted movements in the selected period', async () => {
    const port = createPort([
      transaction({
        id: 'expense-tagged',
        type: 'expense',
        amount: '25.00',
        categoryId: 'cat-food',
        tags: [{ id: 'tag-trip', name: 'Alicante 2026' }],
      }),
    ]);

    await expect(analyticsGetFilterFacets(port, {
      filters: { currency: 'EUR', period: '6M' },
    })).resolves.toEqual({
      accounts: [{ id: 'acc-1', name: 'Main', currency: 'EUR' }],
      tags: [{ id: 'tag-trip', name: 'Alicante 2026' }],
    });
  });

  it('passes selected tags to ledger transaction filters', async () => {
    const port = createPort([
      transaction({
        id: 'expense-tagged',
        type: 'expense',
        amount: '25.00',
        categoryId: 'cat-food',
        tags: [{ id: 'tag-trip', name: 'Alicante 2026' }],
      }),
      transaction({
        id: 'expense-other',
        type: 'expense',
        amount: '30.00',
        categoryId: 'cat-food',
        tags: [{ id: 'tag-home', name: 'Home Renovation' }],
      }),
    ]);

    await expect(analyticsGetSpendingOverview(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
      filters: { tagIds: ['tag-trip'] },
    })).resolves.toMatchObject({
      totalExpenseAmount: '25.00',
    });
    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ tagIds: ['tag-trip'] }),
    }));
  });
});
