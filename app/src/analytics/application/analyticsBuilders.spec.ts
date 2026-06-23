import { describe, expect, it } from 'vitest';
import type { LedgerAccountItem, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import {
  buildAnalyticsCashFlowSummary,
  buildSpendingOverview,
  listAnalyticsCurrencies,
} from './analyticsBuilders';

function transaction(input: Partial<LedgerTransactionListItem> & Pick<LedgerTransactionListItem, 'id' | 'type' | 'amount' | 'currency'>): LedgerTransactionListItem {
  return {
    accountId: 'acc-1',
    status: 'posted',
    occurredAt: '2026-06-01T00:00:00.000Z',
    items: [],
    ...input,
  };
}

const categories: TaxonomyCategoryItem[] = [
  { id: 'cat-food', name: 'Food & Dining', appliesTo: 'expense', status: 'active' },
  { id: 'cat-home', name: 'Housing', appliesTo: 'expense', status: 'active' },
  { id: 'cat-income', name: 'Salary', appliesTo: 'income', status: 'active' },
];

describe('analytics builders', () => {
  it('lists analytics currencies without mixing duplicates', () => {
    const accounts: LedgerAccountItem[] = [
      { id: '1', name: 'EUR', type: 'cash', currency: 'EUR', status: 'active' },
      { id: '2', name: 'USD', type: 'cash', currency: 'usd', status: 'active' },
      { id: '3', name: 'EUR savings', type: 'savings', currency: 'EUR', status: 'archived' },
    ];

    expect(listAnalyticsCurrencies(accounts)).toEqual(['EUR', 'USD']);
  });

  it('puts the preferred account currency first', () => {
    const accounts: LedgerAccountItem[] = [
      { id: '1', name: 'EUR', type: 'cash', currency: 'EUR', status: 'active' },
      { id: '2', name: 'USD', type: 'cash', currency: 'USD', status: 'active' },
      { id: '3', name: 'GBP', type: 'cash', currency: 'GBP', status: 'active' },
    ];

    expect(listAnalyticsCurrencies(accounts, 'usd')).toEqual(['USD', 'EUR', 'GBP']);
  });

  it('builds all-time income expense and net flow for one currency', () => {
    const result = buildAnalyticsCashFlowSummary([
      transaction({ id: 'income-eur', type: 'income', amount: '1000.00', currency: 'EUR' }),
      transaction({ id: 'expense-eur', type: 'expense', amount: '250.00', currency: 'EUR' }),
      transaction({ id: 'income-usd', type: 'income', amount: '999.00', currency: 'USD' }),
      transaction({ id: 'transfer', type: 'transfer_out', amount: '20.00', currency: 'EUR' }),
      transaction({ id: 'voided', type: 'expense', status: 'voided', amount: '100.00', currency: 'EUR' }),
      transaction({ id: 'opening', type: 'income', amount: '500.00', currency: 'EUR', description: 'Opening balance' }),
    ], 'EUR');

    expect(result).toEqual({
      incomeAmount: '1000.00',
      expenseAmount: '250.00',
      netFlowAmount: '750.00',
    });
  });

  it('builds spending overview by expense category and split items for the selected period', () => {
    const result = buildSpendingOverview({
      transactions: [
        transaction({ id: 'rent', type: 'expense', amount: '700.00', currency: 'EUR', categoryId: 'cat-home' }),
        transaction({
          id: 'draft-posted',
          type: 'expense',
          amount: '100.00',
          currency: 'EUR',
          items: [
            { id: 'item-food', name: 'Dinner', amount: '60.00', currency: 'EUR', categoryId: 'cat-food' },
            { id: 'item-home', name: 'Cleaner', amount: '40.00', currency: 'EUR', categoryId: 'cat-home' },
          ],
        }),
        transaction({ id: 'unknown', type: 'expense', amount: '200.00', currency: 'EUR' }),
        transaction({ id: 'salary', type: 'income', amount: '2000.00', currency: 'EUR', categoryId: 'cat-income' }),
        transaction({ id: 'old-rent', type: 'expense', amount: '300.00', currency: 'EUR', categoryId: 'cat-home', occurredAt: '2026-05-31T23:59:59.000Z' }),
      ],
      categories,
      currency: 'EUR',
      granularity: 'monthly',
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result).toEqual({
      granularity: 'monthly',
      window: {
        label: 'Jun 2026',
        periodOffset: 0,
        canGoNext: false,
      },
      totalExpenseAmount: '1000.00',
      categories: [
        { categoryId: 'cat-home', categoryName: 'Housing', amount: '740.00', percentage: 74 },
        { categoryId: undefined, categoryName: 'Uncategorized', amount: '200.00', percentage: 20 },
        { categoryId: 'cat-food', categoryName: 'Food & Dining', amount: '60.00', percentage: 6 },
      ],
    });
  });
});
