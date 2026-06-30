import { describe, expect, it, vi } from 'vitest';
import type { LedgerAccountItem, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import {
  analyticsGetCashFlowSeries,
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
    ledgerListTransactions: vi.fn(async () => ({
      content: transactions,
      page: 0,
      size: transactions.length,
      totalElements: transactions.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    })),
    taxonomyListCategories: vi.fn(async () => ({ items: categories })),
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
});
