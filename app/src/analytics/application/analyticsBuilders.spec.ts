import { describe, expect, it } from 'vitest';
import type { LedgerAccountItem, LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import {
  buildAnalyticsCashFlowSummary,
  buildFlowInsights,
  buildFlowProjection,
  buildFlowUpcoming,
  buildAnalyticsOverviewInsights,
  buildAnalyticsOverviewSnapshot,
  buildSpendingDashboard,
  buildSpendingOverview,
  buildSpendingTimeline,
  buildSpendingTopExpenses,
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

function scheduledMovement(
  input: Partial<SchedulingMovementItem> & Pick<SchedulingMovementItem, 'id' | 'type' | 'sourceAccountId' | 'amount' | 'currency' | 'status' | 'startAt' | 'zoneId' | 'generatedOccurrences' | 'splitItems' | 'rule' | 'recurrenceEnd'>,
): SchedulingMovementItem {
  return {
    targetAccountId: undefined,
    destinationAmount: undefined,
    destinationCurrency: undefined,
    exchangeRate: undefined,
    description: undefined,
    merchant: undefined,
    nextDueAt: undefined,
    reviewPolicy: 'automatic',
    tagIds: [],
    tagNames: [],
    categoryId: undefined,
    scheduleKind: 'recurring',
    origin: 'recurring',
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

  it('builds an overview snapshot with current totals, previous comparison and biggest movements', () => {
    const result = buildAnalyticsOverviewSnapshot({
      currentTransactions: [
        transaction({
          id: 'income-main',
          type: 'income',
          amount: '950.00',
          currency: 'EUR',
          merchant: 'Employer',
          description: 'Work income',
          occurredAt: '2026-06-01T10:00:00.000Z',
        }),
        transaction({
          id: 'expense-main',
          type: 'expense',
          amount: '180.17',
          currency: 'EUR',
          merchant: 'Shop',
          description: 'Shopping',
          occurredAt: '2026-06-12T10:00:00.000Z',
        }),
        transaction({
          id: 'expense-small',
          type: 'expense',
          amount: '20.00',
          currency: 'EUR',
          description: 'Taxi',
          occurredAt: '2026-06-14T10:00:00.000Z',
        }),
      ],
      previousTransactions: [
        transaction({ id: 'income-prev', type: 'income', amount: '700.00', currency: 'EUR', occurredAt: '2026-05-02T10:00:00.000Z' }),
        transaction({ id: 'expense-prev', type: 'expense', amount: '100.00', currency: 'EUR', occurredAt: '2026-05-03T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-07-01T00:00:00.000Z'),
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });

    expect(result).toEqual({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
      },
      currentTotals: {
        incomeAmount: '950.00',
        expenseAmount: '200.17',
        netFlowAmount: '749.83',
      },
      previousTotals: {
        incomeAmount: '700.00',
        expenseAmount: '100.00',
        netFlowAmount: '600.00',
      },
      netFlowChangePercent: '24.97',
      biggestExpense: {
        movementId: 'expense-main',
        title: 'Shopping',
        subtitle: 'Shop',
        amount: '180.17',
        occurredAt: '2026-06-12T10:00:00.000Z',
      },
      biggestIncome: {
        movementId: 'income-main',
        title: 'Work income',
        subtitle: 'Employer',
        amount: '950.00',
        occurredAt: '2026-06-01T10:00:00.000Z',
      },
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
        canGoPrevious: true,
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

  it('builds a spending dashboard summary with previous-period comparison and category breakdown', () => {
    const result = buildSpendingDashboard({
      currentTransactions: [
        transaction({ id: 'shopping', type: 'expense', amount: '180.17', currency: 'EUR', categoryId: 'cat-food', occurredAt: '2026-06-12T10:00:00.000Z' }),
        transaction({ id: 'bills', type: 'expense', amount: '145.90', currency: 'EUR', categoryId: 'cat-home', occurredAt: '2026-06-14T10:00:00.000Z' }),
      ],
      previousTransactions: [
        transaction({ id: 'previous', type: 'expense', amount: '430.00', currency: 'EUR', categoryId: 'cat-home', occurredAt: '2026-05-10T10:00:00.000Z' }),
      ],
      categories,
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-07-01T00:00:00.000Z'),
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-06-01T00:00:00.000Z'),
      },
    });

    expect(result).toEqual({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
      },
      totalExpenseAmount: '326.07',
      previousExpenseChangePercent: '-24.17',
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food & Dining', amount: '180.17', percentage: 55 },
        { categoryId: 'cat-home', categoryName: 'Housing', amount: '145.90', percentage: 45 },
      ],
    });
  });

  it('builds spending timeline daily buckets for the thirty-day period', () => {
    const result = buildSpendingTimeline({
      transactions: [
        transaction({ id: 'expense-1', type: 'expense', amount: '40.00', currency: 'EUR', occurredAt: '2026-06-03T10:00:00.000Z' }),
        transaction({ id: 'expense-2', type: 'expense', amount: '80.00', currency: 'EUR', occurredAt: '2026-06-17T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-07-01T00:00:00.000Z'),
        periodOffset: 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      period: '30D',
    });

    expect(result.points).toHaveLength(30);
    expect(result.points[2]).toEqual(expect.objectContaining({ label: 'Jun 3', amount: '40.00' }));
    expect(result.points[16]).toEqual(expect.objectContaining({ label: 'Jun 17', amount: '80.00' }));
    expect(result.points.reduce((total, point) => Number(total) + Number(point.amount), 0)).toBe(120);
  });

  it('builds spending timeline weekly buckets for the ninety-day period', () => {
    const result = buildSpendingTimeline({
      transactions: [
        transaction({ id: 'expense-1', type: 'expense', amount: '40.00', currency: 'EUR', occurredAt: '2026-05-04T10:00:00.000Z' }),
        transaction({ id: 'expense-2', type: 'expense', amount: '80.00', currency: 'EUR', occurredAt: '2026-05-10T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      currentWindow: {
        label: 'May 1-Jul 31, 2026',
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-08-01T00:00:00.000Z'),
        periodOffset: 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      period: '90D',
    });

    expect(result.points).toHaveLength(14);
    expect(result.points[0]).toEqual(expect.objectContaining({ label: 'May 1', amount: '40.00' }));
    expect(result.points[1]).toEqual(expect.objectContaining({ label: 'May 8', amount: '80.00' }));
  });

  it('builds spending timeline monthly buckets for the yearly period', () => {
    const result = buildSpendingTimeline({
      transactions: [
        transaction({ id: 'expense-1', type: 'expense', amount: '40.00', currency: 'EUR', occurredAt: '2026-01-03T10:00:00.000Z' }),
        transaction({ id: 'expense-2', type: 'expense', amount: '80.00', currency: 'EUR', occurredAt: '2026-12-17T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      currentWindow: {
        label: 'Jan 1-Dec 31, 2026',
        start: new Date('2026-01-01T00:00:00.000Z'),
        end: new Date('2027-01-01T00:00:00.000Z'),
        periodOffset: 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      period: '1Y',
    });

    expect(result.points).toHaveLength(12);
    expect(result.points[0]).toEqual(expect.objectContaining({ label: 'Jan', amount: '40.00' }));
    expect(result.points[11]).toEqual(expect.objectContaining({ label: 'Dec', amount: '80.00' }));
  });

  it('builds top expenses sorted by amount for the current period', () => {
    const result = buildSpendingTopExpenses({
      transactions: [
        transaction({ id: 'small', type: 'expense', amount: '41.90', currency: 'EUR', description: 'Ikea', occurredAt: '2026-06-12T10:00:00.000Z' }),
        transaction({ id: 'big', type: 'expense', amount: '64.23', currency: 'EUR', description: 'Supermarket', occurredAt: '2026-06-10T10:00:00.000Z' }),
        transaction({ id: 'mid', type: 'expense', amount: '52.40', currency: 'EUR', description: 'Amazon', occurredAt: '2026-06-12T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    expect(result.items.map((item) => item.title)).toEqual(['Supermarket', 'Amazon', 'Ikea']);
  });

  it('builds flow projection balance points from posted and scheduled movements', () => {
    const result = buildFlowProjection({
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 7, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-06-08T00:00:00.000Z'),
        periodOffset: 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      period: '30D',
      currentBalanceAmount: '1000.00',
      now: new Date('2026-06-04T12:00:00.000Z'),
      postedTransactions: [
        transaction({ id: 'income-1', type: 'income', amount: '200.00', currency: 'EUR', occurredAt: '2026-06-02T10:00:00.000Z' }),
        transaction({ id: 'expense-1', type: 'expense', amount: '50.00', currency: 'EUR', occurredAt: '2026-06-03T10:00:00.000Z' }),
      ],
      scheduledMovements: [
        scheduledMovement({
          id: 'scheduled-income',
          type: 'income',
          sourceAccountId: 'acc-1',
          amount: '300.00',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-06-05T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly' },
          recurrenceEnd: { kind: 'never' },
        }),
        scheduledMovement({
          id: 'scheduled-expense',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '100.00',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-06-06T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly' },
          recurrenceEnd: { kind: 'never' },
        }),
      ],
    });

    expect(result.currentBalanceAmount).toBe('1000.00');
    expect(result.expectedEndBalanceAmount).toBe('1200.00');
    expect(result.lowestPointLabel).toBe('Jun 1');
    expect(result.points[1]).toEqual(expect.objectContaining({
      label: 'Jun 2',
      postedBalanceAmount: '1050.00',
      expectedBalanceAmount: '1050.00',
    }));
  });

  it('builds upcoming money cards from scheduled movements in the selected window', () => {
    const result = buildFlowUpcoming({
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-07-01T00:00:00.000Z'),
      },
      scheduledMovements: [
        scheduledMovement({
          id: 'income',
          type: 'income',
          sourceAccountId: 'acc-1',
          amount: '300.00',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-06-05T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly' },
          recurrenceEnd: { kind: 'never' },
        }),
        scheduledMovement({
          id: 'expense',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '100.00',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-06-06T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly' },
          recurrenceEnd: { kind: 'never' },
        }),
      ],
    });

    expect(result.incomeItems).toHaveLength(1);
    expect(result.expenseItems).toHaveLength(1);
  });

  it('builds flow insights from the selected window buckets', () => {
    const result = buildFlowInsights({
      currency: 'EUR',
      currentWindow: {
        label: 'Jun 1-Jun 7, 2026',
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-06-08T00:00:00.000Z'),
      },
      period: '30D',
      postedTransactions: [
        transaction({ id: 'income-1', type: 'income', amount: '200.00', currency: 'EUR', occurredAt: '2026-06-02T10:00:00.000Z' }),
        transaction({ id: 'expense-1', type: 'expense', amount: '50.00', currency: 'EUR', occurredAt: '2026-06-03T10:00:00.000Z' }),
      ],
    });

    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toMatchObject({ key: 'bestPeriod', amount: '200.00' });
    expect(result.items[1]).toMatchObject({ key: 'worstPeriod', amount: '-50.00' });
  });

  it('builds overview insights for top tags and transfers from the current period', () => {
    const result = buildAnalyticsOverviewInsights({
      topTagsFact: {
        transactions: [
          transaction({
            id: 'expense-trip',
            type: 'expense',
            amount: '120.00',
            currency: 'EUR',
            tags: [
              { id: 'tag-trip', name: 'Trip' },
              { id: 'tag-friends', name: 'Friends' },
            ],
          }),
          transaction({
            id: 'expense-home',
            type: 'expense',
            amount: '80.00',
            currency: 'EUR',
            tags: [{ id: 'tag-home', name: 'Home' }],
          }),
        ],
        taxonomyAssignments: [
          { transactionId: 'expense-trip', tagIds: ['tag-trip', 'tag-friends'] },
          { transactionId: 'expense-home', tagIds: ['tag-home'] },
        ],
        tags: [
          { id: 'tag-trip', name: 'Trip', status: 'active' },
          { id: 'tag-friends', name: 'Friends', status: 'active' },
          { id: 'tag-home', name: 'Home', status: 'active' },
        ],
      },
      sharingInsights: [
        { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '0 shared', amount: '0.00' },
        { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'No data', amount: '0.00' },
      ],
      recurringInsight: {
        key: 'recurringImpact',
        title: 'Recurring impact',
        subtitle: '0 recurring',
        amount: '0.00',
      },
      transferTransactions: [
        transaction({
          id: 'transfer-out-1',
          type: 'transfer_out',
          amount: '220.00',
          currency: 'EUR',
          linkedTransactionId: 'transfer-in-1',
        }),
        transaction({
          id: 'transfer-in-1',
          type: 'transfer_in',
          amount: '220.00',
          currency: 'EUR',
          linkedTransactionId: 'transfer-out-1',
        }),
      ],
      currency: 'EUR',
    });

    expect(result).toEqual({
      items: [
        {
          key: 'topTags',
          title: 'Top tags',
          subtitle: '3 tags',
          amount: '320.00',
        },
        {
          key: 'sharedExpenses',
          title: 'Shared expenses',
          subtitle: '0 shared',
          amount: '0.00',
        },
        {
          key: 'mostSharedWith',
          title: 'Most shared with',
          subtitle: 'No data',
          amount: '0.00',
        },
        {
          key: 'recurringImpact',
          title: 'Recurring impact',
          subtitle: '0 recurring',
          amount: '0.00',
        },
        {
          key: 'transfers',
          title: 'Transfers',
          subtitle: '1 transfer',
          amount: '220.00',
        },
      ],
    });
  });

  it('builds top tags from taxonomy assignments when transactions are not hydrated with tag objects', () => {
    const result = buildAnalyticsOverviewInsights({
      topTagsFact: {
        transactions: [
          transaction({
            id: 'expense-trip',
            type: 'expense',
            amount: '120.00',
            currency: 'EUR',
          }),
        ],
        taxonomyAssignments: [
          { transactionId: 'expense-trip', tagIds: ['tag-trip'] },
        ],
        tags: [
          { id: 'tag-trip', name: 'Trip', status: 'active' },
        ],
      },
      sharingInsights: [
        { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '0 shared', amount: '0.00' },
        { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'No data', amount: '0.00' },
      ],
      recurringInsight: {
        key: 'recurringImpact',
        title: 'Recurring impact',
        subtitle: '0 recurring',
        amount: '0.00',
      },
      transferTransactions: [],
      currency: 'EUR',
    });

    expect(result.items[0]).toEqual({
      key: 'topTags',
      title: 'Top tags',
      subtitle: '1 tag',
      amount: '120.00',
    });
  });
});
