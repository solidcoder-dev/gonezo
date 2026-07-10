import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  LedgerAccountItem,
  LedgerListTransactionsInput,
  LedgerTransactionListItem,
} from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem } from '../../taxonomy/application/taxonomy.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';
import type { SharingMovementDetailsResult } from '../../sharing/application/sharing.port';
import {
  analyticsGetCashFlowSeries,
  analyticsGetFilterFacets,
  analyticsGetOverviewInsights,
  analyticsGetOverviewSnapshot,
  analyticsGetPeriodCashFlowSummary,
  analyticsGetSpendingDashboard,
  analyticsGetSpendingOverview,
  analyticsGetSpendingTimeline,
  analyticsGetSpendingTopExpenses,
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
  accounts: LedgerAccountItem[] | undefined = [
    { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
  ],
  scheduledMovements: SchedulingMovementItem[] = [],
) {
  const categories: TaxonomyCategoryItem[] = [
    { id: 'cat-food', name: 'Food', appliesTo: 'expense', status: 'active' },
  ];
  return {
    preferencesGet: vi.fn(async () => ({ defaultAccountId: 'acc-1' })),
    ledgerListAccounts: vi.fn(async () => ({ items: accounts })),
    ledgerListTransactions: vi.fn(async (input: LedgerListTransactionsInput) => ({
      content: transactions.filter((item) => {
        const fromDateEpoch = input.filters?.fromDate ? Date.parse(input.filters.fromDate) : undefined;
        const toDateEpoch = input.filters?.toDate ? Date.parse(input.filters.toDate) : undefined;
        const occurredAtEpoch = Date.parse(item.occurredAt);
        if (Number.isFinite(fromDateEpoch) && occurredAtEpoch < fromDateEpoch!) {
          return false;
        }
        if (Number.isFinite(toDateEpoch) && occurredAtEpoch > toDateEpoch!) {
          return false;
        }
        if (input.filters?.tagIds && input.filters.tagIds.length > 0) {
          return item.tags?.some((tag) => input.filters?.tagIds?.includes(tag.id)) ?? false;
        }
        return true;
      }),
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
    sharingGetMovementDetails: vi.fn(async (): Promise<SharingMovementDetailsResult> => null),
    schedulingListMovements: vi.fn(async ({ sourceAccountId }: { sourceAccountId: string }) => ({
      items: scheduledMovements.filter((item) => item.sourceAccountId === sourceAccountId),
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
      filters: { period: '30D' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        fromDate: '2026-06-02T00:00:00.000Z',
        toDate: '2026-07-01T23:59:59.999Z',
      }),
    }));
  });

  it('uses a seven-day date range for the seven-day period', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-week', type: 'expense', amount: '90.00', occurredAt: '2026-06-28T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: 0,
      filters: { period: '7D' },
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

  it('uses a ninety-day range for the ninety-day period', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({ id: 'expense-quarter', type: 'expense', amount: '90.00', occurredAt: '2026-05-03T10:05:00.000Z' }),
    ]);

    await analyticsGetCashFlowSeries(port, {
      currency: 'EUR',
      granularity: 'weekly',
      periodOffset: 0,
      filters: { period: '90D' },
    });

    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        fromDate: '2026-04-03T00:00:00.000Z',
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
      filters: { currency: 'EUR', period: '90D' },
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
      filters: { currency: 'EUR', period: '90D' },
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

  it('builds an overview snapshot for the selected week and compares it with the previous week', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({ id: 'income-current', type: 'income', amount: '300.00', occurredAt: '2026-06-25T09:00:00.000Z', description: 'Salary' }),
      transaction({ id: 'expense-current', type: 'expense', amount: '180.00', occurredAt: '2026-06-28T09:00:00.000Z', description: 'Shopping' }),
      transaction({ id: 'income-previous', type: 'income', amount: '240.00', occurredAt: '2026-06-18T09:00:00.000Z', description: 'Salary' }),
      transaction({ id: 'expense-previous', type: 'expense', amount: '120.00', occurredAt: '2026-06-20T09:00:00.000Z', description: 'Groceries' }),
    ]);

    await expect(analyticsGetOverviewSnapshot(port, {
      currency: 'EUR',
      filters: { period: '7D' },
    })).resolves.toEqual({
      currentWindow: {
        label: 'Jun 24-Jun 30, 2026',
        startDate: '2026-06-24T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'Jun 17-Jun 23, 2026',
        startDate: '2026-06-17T00:00:00.000Z',
        endDate: '2026-06-23T23:59:59.999Z',
      },
      currentTotals: {
        incomeAmount: '300.00',
        expenseAmount: '180.00',
        netFlowAmount: '120.00',
      },
      previousTotals: {
        incomeAmount: '240.00',
        expenseAmount: '120.00',
        netFlowAmount: '120.00',
      },
      netFlowChangePercent: '0.00',
      biggestExpense: {
        movementId: 'expense-current',
        title: 'Shopping',
        subtitle: undefined,
        amount: '180.00',
        occurredAt: '2026-06-28T09:00:00.000Z',
      },
      biggestIncome: {
        movementId: 'income-current',
        title: 'Salary',
        subtitle: undefined,
        amount: '300.00',
        occurredAt: '2026-06-25T09:00:00.000Z',
      },
    });
  });

  it('does not compare against a previous period for all-time overview snapshots', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({ id: 'income-current', type: 'income', amount: '300.00', occurredAt: '2026-06-25T09:00:00.000Z', description: 'Salary' }),
      transaction({ id: 'expense-current', type: 'expense', amount: '180.00', occurredAt: '2026-06-28T09:00:00.000Z', description: 'Shopping' }),
    ]);

    await expect(analyticsGetOverviewSnapshot(port, {
      currency: 'EUR',
      filters: { period: 'ALL' },
    })).resolves.toEqual(expect.objectContaining({
      previousWindow: undefined,
      previousTotals: undefined,
      netFlowChangePercent: undefined,
    }));
  });

  it('builds overview insights for the current period only and respects selected tags', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({
        id: 'expense-trip',
        type: 'expense',
        amount: '120.00',
        occurredAt: '2026-06-25T09:00:00.000Z',
        tags: [{ id: 'tag-trip', name: 'Trip' }],
      }),
      transaction({
        id: 'transfer-out-current',
        type: 'transfer_out',
        amount: '220.00',
        occurredAt: '2026-06-27T09:00:00.000Z',
        linkedTransactionId: 'transfer-in-current',
      }),
      transaction({
        id: 'transfer-in-current',
        type: 'transfer_in',
        amount: '220.00',
        occurredAt: '2026-06-27T09:00:00.000Z',
        linkedTransactionId: 'transfer-out-current',
      }),
      transaction({
        id: 'expense-previous',
        type: 'expense',
        amount: '999.00',
        occurredAt: '2026-05-20T09:00:00.000Z',
        tags: [{ id: 'tag-trip', name: 'Trip' }],
      }),
    ]);

    await expect(analyticsGetOverviewInsights(port, {
      currency: 'EUR',
      filters: { period: '7D', tagIds: ['tag-trip'] },
    })).resolves.toEqual({
      items: [
        {
          key: 'topTags',
          title: 'Top tags',
          subtitle: '1 tag',
          amount: '120.00',
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
          subtitle: '0 transfers',
          amount: '0.00',
        },
      ],
    });
  });

  it('builds the spending dashboard for the selected period and compares with the previous one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({
        id: 'expense-current',
        type: 'expense',
        amount: '180.00',
        occurredAt: '2026-06-25T09:00:00.000Z',
        categoryId: 'cat-food',
      }),
      transaction({
        id: 'expense-previous',
        type: 'expense',
        amount: '240.00',
        occurredAt: '2026-05-10T09:00:00.000Z',
        categoryId: 'cat-food',
      }),
    ]);

    await expect(analyticsGetSpendingDashboard(port, {
      currency: 'EUR',
      filters: { period: '7D' },
    })).resolves.toEqual({
      currentWindow: {
        label: 'Jun 24-Jun 30, 2026',
        startDate: '2026-06-24T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'Jun 17-Jun 23, 2026',
        startDate: '2026-06-17T00:00:00.000Z',
        endDate: '2026-06-23T23:59:59.999Z',
      },
      totalExpenseAmount: '180.00',
      previousExpenseChangePercent: undefined,
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food', amount: '180.00', percentage: 100 },
      ],
    });
  });

  it('builds spending timeline and top expenses from the current window only', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({
        id: 'expense-1',
        type: 'expense',
        amount: '180.00',
        occurredAt: '2026-06-25T09:00:00.000Z',
        description: 'Supermarket',
      }),
      transaction({
        id: 'expense-2',
        type: 'expense',
        amount: '80.00',
        occurredAt: '2026-06-27T09:00:00.000Z',
        description: 'Transport',
      }),
    ]);

    await expect(analyticsGetSpendingTimeline(port, {
      currency: 'EUR',
      filters: { period: '7D' },
    })).resolves.toEqual(expect.objectContaining({
      currentWindow: expect.objectContaining({ label: 'Jun 24-Jun 30, 2026' }),
      points: expect.arrayContaining([
        expect.objectContaining({ label: 'Jun 24' }),
        expect.objectContaining({ label: 'Jun 30' }),
      ]),
    }));

    await expect(analyticsGetSpendingTopExpenses(port, {
      currency: 'EUR',
      filters: { period: '7D' },
    })).resolves.toEqual({
      currentWindow: {
        label: 'Jun 24-Jun 30, 2026',
        startDate: '2026-06-24T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      items: [
        {
          movementId: 'expense-1',
          title: 'Supermarket',
          subtitle: undefined,
          amount: '180.00',
          occurredAt: '2026-06-25T09:00:00.000Z',
        },
        {
          movementId: 'expense-2',
          title: 'Transport',
          subtitle: undefined,
          amount: '80.00',
          occurredAt: '2026-06-27T09:00:00.000Z',
        },
      ],
    });
  });

  it('builds annual spending timeline pages for the all-period filter', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:30:00.000Z'));
    const port = createPort([
      transaction({
        id: 'expense-old',
        type: 'expense',
        amount: '180.00',
        occurredAt: '2022-05-25T09:00:00.000Z',
        description: 'Supermarket',
      }),
      transaction({
        id: 'expense-new',
        type: 'expense',
        amount: '80.00',
        occurredAt: '2026-07-27T09:00:00.000Z',
        description: 'Transport',
      }),
    ]);

    const result = await analyticsGetSpendingTimeline(port, {
      currency: 'EUR',
      filters: { period: 'ALL' },
    });

    expect(result.window).toEqual({ label: '2022 - 2026', periodOffset: 0, canGoPrevious: false, canGoNext: false });
    expect(result.points.map((point) => point.label)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(result.points.map((point) => point.amount)).toEqual(['180.00', '0.00', '0.00', '0.00', '80.00']);
  });

  it('builds top tags from taxonomy assignments when posted movements do not include hydrated tag objects', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort([
      transaction({
        id: 'expense-trip',
        type: 'expense',
        amount: '120.00',
        occurredAt: '2026-06-25T09:00:00.000Z',
      }),
    ]);

    vi.mocked(port.orchestrationListTransactionTaxonomy).mockResolvedValue({
      items: [{ transactionId: 'expense-trip', tagIds: ['tag-trip'] }],
    });

    await expect(analyticsGetOverviewInsights(port, {
      currency: 'EUR',
      filters: { period: '7D' },
    })).resolves.toEqual({
      items: [
        {
          key: 'topTags',
          title: 'Top tags',
          subtitle: '1 tag',
          amount: '120.00',
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
          subtitle: '0 transfers',
          amount: '0.00',
        },
      ],
    });
  });

  it('aggregates sharing and recurring insights from their own read-model use cases', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T12:00:00.000Z'));
    const port = createPort(
      [
        transaction({
          id: 'expense-shared',
          type: 'expense',
          amount: '180.00',
          occurredAt: '2026-06-26T09:00:00.000Z',
          tags: [{ id: 'tag-trip', name: 'Trip' }],
        }),
      ],
      [
        { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
      ],
      [
        {
          id: 'rec-1',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '145.90',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-06-01T00:00:00.000Z',
          nextDueAt: '2026-06-28T00:00:00.000Z',
          zoneId: 'Europe/Madrid',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly' },
          recurrenceEnd: { kind: 'never' },
          tagIds: ['tag-trip'],
          scheduleKind: 'recurring',
          origin: 'recurring',
        },
      ],
    );

    vi.mocked(port.sharingGetMovementDetails).mockResolvedValue({
      shareId: 'share-1',
      transactionId: 'expense-shared',
      participants: [
        {
          participantId: 'participant-1',
          personId: 'person-1',
          displayName: 'Ana',
          amount: '120.00',
          reimbursable: true,
          repaymentStatus: 'pending',
        },
      ],
      analytics: {
        personalExpenseAmount: '60.00',
        excludedLentAmount: '120.00',
        excludedReimbursementIncomeAmount: '0.00',
      },
    } satisfies Exclude<SharingMovementDetailsResult, null>);

    await expect(analyticsGetOverviewInsights(port, {
      currency: 'EUR',
      filters: { period: '7D', tagIds: ['tag-trip'] },
    })).resolves.toEqual({
      items: [
        {
          key: 'topTags',
          title: 'Top tags',
          subtitle: '1 tag',
          amount: '180.00',
        },
        {
          key: 'sharedExpenses',
          title: 'Shared expenses',
          subtitle: '1 shared',
          amount: '120.00',
        },
        {
          key: 'mostSharedWith',
          title: 'Most shared with',
          subtitle: 'Ana',
          amount: '120.00',
        },
        {
          key: 'recurringImpact',
          title: 'Recurring impact',
          subtitle: '1 recurring',
          amount: '145.90',
        },
        {
          key: 'transfers',
          title: 'Transfers',
          subtitle: '0 transfers',
          amount: '0.00',
        },
      ],
    });
  });
});
