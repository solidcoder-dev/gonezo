import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExpectedMovementView } from '../domain/movementsView.types';
import type {
  MonthlyMovementsModelClock,
  MonthlyMovementsModelPorts,
  MonthlyMovementsModelTimers,
} from './useMonthlyMovementsModel';
import { useMonthlyMovementsModel } from './useMonthlyMovementsModel';

function emptyPage() {
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

function emptyOverview() {
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
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn(),
      ledgerGetAccountSummary: vi.fn(),
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

function expectedMovement(): ExpectedMovementView {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    type: 'expense',
    amount: '12.00',
    currency: 'USD',
    expectedAt: '2026-05-20T00:00:00.000Z',
    splitItems: [],
    status: 'pending',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

describe('useMonthlyMovementsModel', () => {
  it('loads monthly movements through injected ports using the injected clock', async () => {
    const clock: MonthlyMovementsModelClock = {
      now: () => new Date(2026, 4, 15, 9, 30, 0, 0),
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
        fromDate: new Date(2026, 4, 1, 0, 0, 0, 0).toISOString(),
        toDate: new Date(2026, 4, 31, 23, 59, 59, 999).toISOString(),
      },
    }));
    expect(ports.taxonomy.taxonomyListCategories).toHaveBeenCalledWith({ includeArchived: false });
    expect(ports.taxonomy.taxonomyListTags).toHaveBeenCalledWith({ includeArchived: false });
  });

  it('dismisses expected movements with the injected clock', async () => {
    const now = new Date('2026-05-15T10:20:30.000Z');
    const expectedDismissMovement = vi.fn().mockResolvedValue(undefined);
    const ports = makePorts({
      expected: {
        ...makePorts().expected,
        expectedDismissMovement,
      },
    });

    const { result } = renderHook(() => useMonthlyMovementsModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      clock: { now: () => now },
      timers: makeTimers(),
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    await act(async () => {
      await result.current.provided.commands.dismissExpectedMovement(expectedMovement());
    });

    expect(expectedDismissMovement).toHaveBeenCalledWith({
      expectedMovementId: 'expected-1',
      dismissedAt: now.toISOString(),
    });
  });
});
