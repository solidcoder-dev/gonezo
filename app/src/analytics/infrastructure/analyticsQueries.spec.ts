import { afterEach, describe, expect, it, vi } from 'vitest';
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

function createPort(
  transactions: LedgerTransactionListItem[],
  accounts: LedgerAccountItem[] = [
    { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
  ],
) {
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
  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes ignored movements from analytics summaries, series and spending', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
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

  it('uses an explicit end-of-day instant so today movements are included on Android', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'income-today', type: 'income', amount: '100000.00', occurredAt: '2026-07-01T10:00:00.000Z' }),
      transaction({ id: 'expense-today', type: 'expense', amount: '90000.00', occurredAt: '2026-07-01T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
      filters: { period: '1M' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        fromDate: '2026-07-01T00:00:00.000Z',
        toDate: '2026-07-01T23:59:59.999Z',
      }),
    }));
  });

  it('uses a seven-day date range for the one-week period', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-week', type: 'expense', amount: '90.00', occurredAt: '2026-06-28T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
      filters: { period: '1W' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        fromDate: '2026-06-25T00:00:00.000Z',
        toDate: '2026-07-01T23:59:59.999Z',
      }),
    }));
  });

  it('uses five visible cash flow buckets inside the selected period range', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-year', type: 'expense', amount: '90.00', occurredAt: '2026-06-28T10:05:00.000Z' }),
    ]);

    const result = await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
      filters: { period: '1Y' },
    });

    expect(result.points.map((point) => point.periodKey)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(result.window.canGoPrevious).toBe(true);
  });

  it('uses a five-year range for the five-year period', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-year', type: 'expense', amount: '90.00', occurredAt: '2023-06-28T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'yearly',
      periodOffset: 0,
      filters: { period: '5Y' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        fromDate: '2022-01-01T00:00:00.000Z',
        toDate: '2026-07-01T23:59:59.999Z',
      }),
    }));
  });

  it('does not pass date bounds for the all-period filter', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-old', type: 'expense', amount: '90.00', occurredAt: '2018-06-28T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'yearly',
      periodOffset: 0,
      filters: { period: 'ALL' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.not.objectContaining({
        fromDate: expect.any(String),
        toDate: expect.any(String),
      }),
    }));
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

  it('lists all account facets regardless of the selected currency', async () => {
    const port = createPort(
      [transaction({ id: 'expense-tagged', type: 'expense', amount: '25.00' })],
      [
        { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
        { id: 'acc-2', name: 'Travel', type: 'cash', currency: 'USD', status: 'active' },
      ],
    );

    await expect(analyticsGetFilterFacets(port, {
      filters: { currency: 'EUR', period: '6M' },
    })).resolves.toMatchObject({
      accounts: [
        { id: 'acc-1', name: 'Main', currency: 'EUR' },
        { id: 'acc-2', name: 'Travel', currency: 'USD' },
      ],
    });
  });

  it('passes selected tags to ledger transaction filters', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
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
