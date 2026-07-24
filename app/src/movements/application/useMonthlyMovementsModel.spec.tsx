import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  LedgerListTransactionsResult,
  LedgerTransactionListItem,
} from '../../ledger/application/ledger.port';
import type {
  MovementsMonthOverviewInput,
  MovementsMonthOverviewResult,
} from './movements.port';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import type {
  MonthlyMovementsModelClock,
  MonthlyMovementsModelPorts,
  MonthlyMovementsModelTimers,
} from './useMonthlyMovementsModel';
import { useMonthlyMovementsModel } from './useMonthlyMovementsModel';

function emptyPage(): LedgerListTransactionsResult {
  return {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };
}

function pageWith(
  content: LedgerTransactionListItem[] = [],
  overrides: Partial<LedgerListTransactionsResult> = {},
): LedgerListTransactionsResult {
  return {
    ...emptyPage(),
    content,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    ...overrides,
  };
}

function emptyOverview(overrides: Partial<MovementsMonthOverviewResult> = {}): MovementsMonthOverviewResult {
  return {
    ...baseOverview(),
    ...overrides,
  };
}

function baseOverview(): MovementsMonthOverviewResult {
  return {
    scheduledPreview: {
      items: [],
      total: 0,
      hasMore: false,
    },
    expectedPreview: {
      items: [],
      total: 0,
      hasMore: false,
    },
    postedPage: emptyPage(),
    executedPage: emptyPage(),
  };
}

function makePorts(overrides: Partial<MonthlyMovementsModelPorts> = {}): MonthlyMovementsModelPorts {
  return {
    movements: {
      movementsGetDetail: vi.fn().mockResolvedValue({ found: false }),
    },
    analytics: {
      analyticsSetMovementIgnored: vi.fn().mockResolvedValue(undefined),
    },
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn(),
      ledgerGetAccountSummary: vi.fn(),
      ledgerGetNetWorthByCurrency: vi.fn().mockResolvedValue({ items: [] }),
      ledgerGetCashFlowSeries: vi.fn(),
      ledgerListTransactions: vi.fn(),
      ledgerOpenAccount: vi.fn(),
      ledgerRenameAccount: vi.fn(),
      ledgerArchiveAccount: vi.fn(),
      ledgerRestoreAccount: vi.fn(),
      ledgerDeleteAccount: vi.fn(),
      ledgerRecordExpense: vi.fn(),
      ledgerRecordIncome: vi.fn(),
      ledgerRecordTransfer: vi.fn(),
      ledgerRecordTransferFx: vi.fn(),
      ledgerCreateExpenseDraft: vi.fn(),
      ledgerAddTransactionItem: vi.fn(),
      ledgerPostDraftTransaction: vi.fn(),
      ledgerVoidTransaction: vi.fn(),
    },
    scheduling: {
      schedulingCreateMovement: vi.fn(),
      schedulingUpdateMovement: vi.fn(),
      schedulingDeactivateMovement: vi.fn(),
      schedulingListMovements: vi.fn(),
      schedulingGetMovement: vi.fn(),
      movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview()),
      movementsListScheduled: vi.fn(),
    },
    expected: {
      expectedCreateMovement: vi.fn(),
      expectedUpdateMovement: vi.fn(),
      expectedListMovements: vi.fn(),
      expectedResolveMovement: vi.fn(),
      expectedDismissMovement: vi.fn().mockResolvedValue(undefined),
    },
    sharing: {
      sharingListPeople: vi.fn(),
      sharingApplyShareToPostedTransaction: vi.fn(),
      sharingGetMovementDetails: vi.fn().mockResolvedValue(null),
      sharingListMovementDetails: vi.fn(),
    },
    taxonomy: {
      taxonomyListCategories: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyCreateCategory: vi.fn(),
      taxonomyRenameCategory: vi.fn(),
      taxonomyListTags: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyRenameTag: vi.fn(),
      orchestrationCategorizeTransaction: vi.fn(),
      orchestrationApplyTransactionTags: vi.fn(),
      orchestrationListTransactionTaxonomy: vi.fn().mockResolvedValue({ items: [] }),
    },
    ...overrides,
  };
}

function makeTimers(): MonthlyMovementsModelTimers {
  return {
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
  };
}

function makeControllableTimers() {
  const handlers: Array<() => void> = [];
  const timers: MonthlyMovementsModelTimers = {
    setTimeout: vi.fn((handler) => {
      handlers.push(handler);
      return handlers.length;
    }),
    clearTimeout: vi.fn(),
  };
  return { timers, handlers };
}

function postedTransaction(overrides: Partial<LedgerTransactionListItem> = {}): LedgerTransactionListItem {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    status: 'posted',
    amount: '12.00',
    currency: 'USD',
    occurredAt: '2026-05-14T10:20:30.000Z',
    description: 'Lunch',
    merchant: 'Cafe',
    items: [],
    ...overrides,
  };
}

function scheduledMovement(overrides: Partial<ScheduledMovementView> = {}): ScheduledMovementView {
  return {
    id: 'sch-1',
    type: 'expense',
    sourceAccountId: 'account-1',
    accountName: 'Main',
    amount: '24.00',
    currency: 'USD',
    description: 'Rent',
    merchant: 'Landlord',
    status: 'active',
    startAt: '2026-05-14T00:00:00.000Z',
    nextDueAt: '2026-05-20T00:00:00.000Z',
    zoneId: 'UTC',
    generatedOccurrences: 2,
    splitItems: [{ id: 'item-1', name: 'Base', amount: '24.00' }],
    rule: { frequency: 'monthly', interval: 1, monthlyPattern: 'day_of_month', dayOfMonth: 20 },
    recurrenceEnd: { kind: 'never' },
    categoryId: 'cat-food',
    tagIds: ['tag-lunch'],
    tagNames: ['Lunch'],
    scheduleKind: 'recurring',
    origin: 'recurring',
    ...overrides,
  };
}

function expectedMovement(overrides: Partial<ExpectedMovementView> = {}): ExpectedMovementView {
  return {
    id: 'exp-1',
    accountId: 'account-1',
    accountName: 'Main',
    type: 'expense',
    amount: '12.00',
    currency: 'USD',
    expectedAt: '2026-05-20T00:00:00.000Z',
    description: 'Lunch',
    merchant: 'Cafe',
    categoryId: 'cat-food',
    splitItems: [{ id: 'item-1', name: 'Lunch', amount: '12.00' }],
    status: 'pending',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ignored: true,
    origin: { kind: 'manual' },
    ...overrides,
  };
}

describe('useMonthlyMovementsModel', () => {
  it('owns Posted as the default mode and preserves it while changing month', async () => {
    const currentMonth = new Date(2026, 4, 15, 9, 30, 0, 0);
    const movementsGetOverview = vi.fn().mockResolvedValue(emptyOverview());
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview,
      },
    });
    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => currentMonth },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));
    expect(result.current.required.state.selectedMode).toBe('posted');

    act(() => {
      result.current.provided.commands.selectMode('planned');
    });
    expect(result.current.required.state.selectedMode).toBe('planned');

    act(() => {
      result.current.provided.commands.goToNextMonth();
    });

    expect(result.current.required.state.selectedMode).toBe('planned');
  });

  it('loads monthly movements through injected ports using the injected clock', async () => {
    const currentMonth = new Date(2026, 4, 15, 9, 30, 0, 0);
    const clock: MonthlyMovementsModelClock = {
      now: () => currentMonth,
    };
    const movementsGetOverview = vi.fn().mockResolvedValue(emptyOverview());
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview,
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock,
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    expect(movementsGetOverview).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'account-1',
      filters: {
        fromDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0, 0).toISOString(),
        toDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
      },
    }));
    expect(ports.taxonomy.taxonomyListCategories).toHaveBeenCalledWith({ includeArchived: false });
    expect(ports.taxonomy.taxonomyListTags).toHaveBeenCalledWith({ includeArchived: false });
  });

  it('moves between months and refreshes the requested month range', async () => {
    const currentMonth = new Date(2026, 4, 15, 9, 30, 0, 0);
    const clock: MonthlyMovementsModelClock = {
      now: () => currentMonth,
    };
    const movementsGetOverview = vi.fn().mockResolvedValue(emptyOverview());
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview,
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock,
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.goToNextMonth();
    });

    await waitFor(() => expect(movementsGetOverview).toHaveBeenCalledWith(expect.objectContaining({
      filters: {
        fromDate: new Date(2026, 5, 1, 0, 0, 0, 0).toISOString(),
        toDate: new Date(2026, 6, 0, 23, 59, 59, 999).toISOString(),
      },
    })));
    expect(result.current.required.state.viewedMonthIndex).toBe(5);
  });

  it('loads monthly posted movements as an accumulated 100 item page', async () => {
    const firstPage = postedTransaction({ id: 'tx-1', description: 'First' });
    const secondPage = postedTransaction({ id: 'tx-2', description: 'Second' });
    const movementsGetOverview = vi.fn((input: MovementsMonthOverviewInput) => Promise.resolve(
      input.executedPagination?.page === 1
        ? emptyOverview({
          postedPage: pageWith([secondPage], {
            page: 1,
            size: 100,
            totalElements: 101,
            totalPages: 2,
            hasPrevious: true,
          }),
          executedPage: pageWith([secondPage], {
            page: 1,
            size: 100,
            totalElements: 101,
            totalPages: 2,
            hasPrevious: true,
          }),
        })
        : emptyOverview({
          postedPage: pageWith([firstPage], {
            page: 0,
            size: 100,
            totalElements: 101,
            totalPages: 2,
            hasNext: true,
          }),
          executedPage: pageWith([firstPage], {
            page: 0,
            size: 100,
            totalElements: 101,
            totalPages: 2,
            hasNext: true,
          }),
        }),
    ));
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview,
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date(2026, 4, 15, 9, 30, 0, 0) },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.state.items.map((item) => item.id)).toEqual(['tx-1']));
    expect(movementsGetOverview).toHaveBeenCalledWith(expect.objectContaining({
      executedPagination: { page: 0, size: 100 },
    }));

    act(() => {
      result.current.provided.commands.goToNextPage();
    });

    await waitFor(() => expect(result.current.required.state.items.map((item) => item.id)).toEqual(['tx-1', 'tx-2']));
    expect(movementsGetOverview).toHaveBeenCalledWith(expect.objectContaining({
      executedPagination: { page: 1, size: 100 },
    }));
  });

  it('hydrates account names for all-account monthly posted movements', async () => {
    const transaction = postedTransaction({ accountId: 'account-2' });
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerListAccounts: vi.fn().mockResolvedValue({
          items: [
            { id: 'account-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
            { id: 'account-2', name: 'Savings', type: 'cash', currency: 'USD', status: 'active' },
          ],
        }),
      },
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
        })),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: null,
      scope: 'all',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date(2026, 4, 15, 9, 30, 0, 0) },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.state.items).toHaveLength(1));

    expect(ports.ledger.ledgerListAccounts).toHaveBeenCalled();
    expect(result.current.required.state.items[0].accountName).toBe('Savings');
  });

  it('supports undoing and committing a delayed void request', async () => {
    const { timers, handlers } = makeControllableTimers();
    const ledgerVoidTransaction = vi.fn().mockResolvedValue(undefined);
    const onVoided = vi.fn();
    const transaction = postedTransaction();
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerVoidTransaction,
      },
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
        })),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date('2026-05-15T10:20:30.000Z') },
      timers,
      onVoided,
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.openPostedMovementDetail('tx-1');
    });
    await waitFor(() => expect(result.current.required.detail.data.movement?.id).toBe('tx-1'));
    act(() => {
      result.current.provided.detail.commands.runOverflowAction('void-posted');
    });

    await waitFor(() => expect(result.current.required.state.pendingVoidTransactionId).toBe('tx-1'));
    expect(result.current.toast.message).toBe('Transaction will be voided in 5 seconds.');
    expect(result.current.toast.actionLabel).toBe('Undo');

    act(() => {
      result.current.toast.runAction();
    });

    expect(timers.clearTimeout).toHaveBeenCalledWith(1);
    expect(result.current.required.state.pendingVoidTransactionId).toBeUndefined();
    expect(result.current.toast.message).toBe('Void canceled.');
    expect(ledgerVoidTransaction).not.toHaveBeenCalled();

    act(() => {
      result.current.provided.commands.openPostedMovementDetail('tx-1');
    });
    await waitFor(() => expect(result.current.required.detail.data.movement?.id).toBe('tx-1'));
    act(() => {
      result.current.provided.detail.commands.runOverflowAction('void-posted');
    });
    act(() => {
      handlers[1]();
    });

    await waitFor(() => expect(ledgerVoidTransaction).toHaveBeenCalledWith({ transactionId: 'tx-1' }));
    expect(onVoided).toHaveBeenCalledWith('tx-1');
    await waitFor(() => expect(result.current.toast.message).toBe('Transaction voided.'));
  });

  it('hydrates posted transaction taxonomy for the monthly list', async () => {
    const transaction = postedTransaction({ categoryId: 'cat-food' });
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
        })),
      },
      taxonomy: {
        ...makePorts().taxonomy,
        taxonomyListCategories: vi.fn().mockResolvedValue({
          items: [{ id: 'cat-food', name: 'Food', appliesTo: 'expense', status: 'active' }],
        }),
        taxonomyListTags: vi.fn().mockResolvedValue({
          items: [{ id: 'tag-lunch', name: 'Lunch', status: 'active' }],
        }),
        orchestrationListTransactionTaxonomy: vi.fn().mockResolvedValue({
          items: [{ transactionId: 'tx-1', categoryId: 'cat-food', tagIds: ['tag-lunch'] }],
        }),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date(2026, 4, 15, 9, 30, 0, 0) },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.state.items).toHaveLength(1));

    expect(result.current.required.state.items[0].category).toEqual({ id: 'cat-food', name: 'Food' });
    expect(result.current.required.state.items[0].tags).toEqual([{ id: 'tag-lunch', name: 'Lunch' }]);
    expect(result.current.required.state.filterOptions.categories).toEqual([{ id: 'cat-food', label: 'Food' }]);
    expect(result.current.required.state.filterOptions.tags).toEqual([{ id: 'tag-lunch', label: 'Lunch' }]);
  });

  it('updates posted category and tags from the detail model', async () => {
    const transaction = postedTransaction({ categoryId: 'cat-food', tags: [{ id: 'tag-lunch', name: 'Lunch' }] });
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
        })),
      },
      taxonomy: {
        ...makePorts().taxonomy,
        taxonomyListCategories: vi.fn().mockResolvedValue({
          items: [
            { id: 'cat-food', name: 'Food', appliesTo: 'expense', status: 'active' },
            { id: 'cat-fun', name: 'Fun', appliesTo: 'expense', status: 'active' },
          ],
        }),
        taxonomyListTags: vi.fn().mockResolvedValue({
          items: [
            { id: 'tag-lunch', name: 'Lunch', status: 'active' },
            { id: 'tag-home', name: 'Home', status: 'active' },
          ],
        }),
        orchestrationCategorizeTransaction: vi.fn().mockResolvedValue({ status: 'assigned' }),
        orchestrationApplyTransactionTags: vi.fn().mockResolvedValue({ status: 'assigned' }),
        orchestrationListTransactionTaxonomy: vi.fn().mockResolvedValue({
          items: [{ transactionId: 'tx-1', categoryId: 'cat-food', tagIds: ['tag-lunch'] }],
        }),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date('2026-05-15T10:20:30.000Z') },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.openPostedMovementDetail('tx-1');
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveCategory('cat-fun');
    });
    expect(ports.taxonomy.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      transactionType: 'expense',
      categoryId: 'cat-fun',
    });

    act(() => {
      result.current.provided.detail.commands.openTagsSheet();
      result.current.provided.detail.commands.toggleDraftTag({ id: 'tag-home', name: 'Home' });
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveTags();
    });
    expect(ports.taxonomy.orchestrationApplyTransactionTags).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      tagNames: ['Lunch', 'Home'],
    });

    act(() => {
      result.current.provided.detail.commands.openTagsSheet();
      result.current.provided.detail.commands.toggleDraftTag({ id: 'tag-lunch', name: 'Lunch' });
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveTags();
    });
    expect(ports.taxonomy.orchestrationApplyTransactionTags).toHaveBeenLastCalledWith({
      transactionId: 'tx-1',
      tagNames: [],
    });
  });

  it('blocks transfer categorization and still updates transfer tags', async () => {
    const transaction = postedTransaction({ id: 'tx-transfer', type: 'transfer', categoryId: undefined, tags: [] });
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
        })),
      },
      taxonomy: {
        ...makePorts().taxonomy,
        taxonomyListTags: vi.fn().mockResolvedValue({
          items: [{ id: 'tag-home', name: 'Home', status: 'active' }],
        }),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date('2026-05-15T10:20:30.000Z') },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));
    act(() => {
      result.current.provided.commands.openPostedMovementDetail('tx-transfer');
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveCategory('cat-food');
    });
    expect(ports.taxonomy.orchestrationCategorizeTransaction).not.toHaveBeenCalled();

    act(() => {
      result.current.provided.detail.commands.openTagsSheet();
      result.current.provided.detail.commands.toggleDraftTag({ id: 'tag-home', name: 'Home' });
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveTags();
    });
    expect(ports.taxonomy.orchestrationApplyTransactionTags).toHaveBeenCalledWith({
      transactionId: 'tx-transfer',
      tagNames: ['Home'],
    });
  });

  it('preserves scheduled and expected payloads and emits expected composer callbacks', async () => {
    const schedule = scheduledMovement();
    const transferSchedule = scheduledMovement({ id: 'sch-transfer', type: 'transfer', categoryId: undefined, targetAccountId: 'account-2' });
    const expected = expectedMovement();
    const onEditExpectedMovement = vi.fn();
    const onPostExpectedMovement = vi.fn();
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          scheduledPreview: { items: [schedule, transferSchedule], total: 2, hasMore: false },
          expectedPreview: { items: [expected], total: 1, hasMore: false },
        })),
        schedulingUpdateMovement: vi.fn().mockResolvedValue({ id: 'sch-1' }),
      },
      taxonomy: {
        ...makePorts().taxonomy,
        taxonomyListCategories: vi.fn().mockResolvedValue({
          items: [
            { id: 'cat-food', name: 'Food', appliesTo: 'expense', status: 'active' },
            { id: 'cat-fun', name: 'Fun', appliesTo: 'expense', status: 'active' },
          ],
        }),
        taxonomyListTags: vi.fn().mockResolvedValue({
          items: [
            { id: 'tag-lunch', name: 'Lunch', status: 'active' },
            { id: 'tag-home', name: 'Home', status: 'active' },
          ],
        }),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date('2026-05-15T10:20:30.000Z') },
      timers: makeTimers(),
      onEditExpectedMovement,
      onPostExpectedMovement,
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.openScheduledMovementDetail('sch-1');
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveCategory('cat-fun');
    });
    act(() => {
      result.current.provided.detail.commands.openTagsSheet();
      result.current.provided.detail.commands.toggleDraftTag({ id: 'tag-home', name: 'Home' });
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveTags();
    });

    expect(ports.scheduling.schedulingUpdateMovement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      recurringMovementId: 'sch-1',
      sourceAccountId: 'account-1',
      amount: '24.00',
      currency: 'USD',
      categoryId: 'cat-fun',
      splitItems: [{ id: 'item-1', name: 'Base', amount: '24.00' }],
    }));
    expect(ports.scheduling.schedulingUpdateMovement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      recurringMovementId: 'sch-1',
      categoryId: 'cat-food',
      tagIds: ['tag-lunch', 'tag-home'],
      tagNames: ['Lunch', 'Home'],
    }));

    act(() => {
      result.current.provided.commands.openScheduledMovementDetail('sch-transfer');
      result.current.provided.detail.commands.openTagsSheet();
      result.current.provided.detail.commands.toggleDraftTag({ id: 'tag-home', name: 'Home' });
    });
    await act(async () => {
      await result.current.provided.detail.commands.saveTags();
    });
    const transferPayload = vi.mocked(ports.scheduling.schedulingUpdateMovement).mock.calls[2]?.[0];
    expect(Object.prototype.hasOwnProperty.call(transferPayload, 'categoryId')).toBe(false);

    act(() => {
      result.current.provided.commands.openExpectedMovementDetail('exp-1');
    });
    await waitFor(() => expect(result.current.required.detail.data.movement?.id).toBe('exp-1'));
    await act(async () => {
      await result.current.provided.detail.commands.saveCategory('cat-fun');
    });
    expect(ports.expected.expectedUpdateMovement).toHaveBeenCalledWith(expect.objectContaining({
      expectedMovementId: 'exp-1',
      accountId: 'account-1',
      amount: '12.00',
      currency: 'USD',
      expectedAt: '2026-05-20T00:00:00.000Z',
      ignored: true,
      splitItems: [{ id: 'item-1', name: 'Lunch', amount: '12.00' }],
    }));
    act(() => {
      result.current.provided.detail.commands.runOverflowAction('edit-expected');
    });
    expect(onEditExpectedMovement).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp-1' }), 'Food');

    act(() => {
      result.current.provided.commands.openExpectedMovementDetail('exp-1');
    });
    await waitFor(() => expect(result.current.required.detail.data.movement?.id).toBe('exp-1'));
    act(() => {
      result.current.provided.detail.commands.postExpectedMovement();
    });
    expect(onPostExpectedMovement).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp-1' }), 'Food');
  });

  it('loads sharing lazily for posted expenses and handles confirmation for schedule deactivation', async () => {
    const transaction = postedTransaction({ amount: '48.20', currency: 'EUR' });
    const confirm = vi.fn(() => true);
    const ports = makePorts({
      scheduling: {
        ...makePorts().scheduling,
        movementsGetOverview: vi.fn().mockResolvedValue(emptyOverview({
          postedPage: pageWith([transaction]),
          executedPage: pageWith([transaction]),
          scheduledPreview: { items: [scheduledMovement()], total: 1, hasMore: false },
        })),
      },
      sharing: {
        ...makePorts().sharing,
        sharingGetMovementDetails: vi.fn().mockResolvedValue({
          shareId: 'share-1',
          transactionId: 'tx-1',
          participants: [{ participantId: 'p-1', personId: 'person-1', displayName: 'Ana', amount: '16.07', reimbursable: true, repaymentStatus: 'pending' }],
          analytics: { personalExpenseAmount: '16.07', excludedLentAmount: '0.00', excludedReimbursementIncomeAmount: '0.00' },
        }),
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => new Date('2026-05-15T10:20:30.000Z') },
      timers: makeTimers(),
      confirm,
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.openPostedMovementDetail('tx-1');
    });
    await waitFor(() => expect(ports.sharing.sharingGetMovementDetails).toHaveBeenCalledWith({ transactionId: 'tx-1' }));
    if (result.current.required.detail.data.movement?.source === 'posted' && result.current.required.detail.data.movement.sharing.phase === 'loaded') {
      expect(result.current.required.detail.data.movement.sharing.value?.personalExpenseAmount).toBe('16.07');
    }

    act(() => {
      result.current.provided.commands.openScheduledMovementDetail('sch-1');
    });
    await act(async () => {
      result.current.provided.detail.commands.runOverflowAction('stop-recurring-series');
    });
    expect(confirm).toHaveBeenCalled();
    expect(ports.scheduling.schedulingDeactivateMovement).toHaveBeenCalledWith({ recurringMovementId: 'sch-1' });
  });
});
