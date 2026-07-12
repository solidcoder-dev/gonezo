import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type {
  TransactionEntryModelClock,
  TransactionEntryModelIdGenerator,
  TransactionEntryModelPorts,
} from './useTransactionEntryModel';
import { useTransactionEntryModel } from './useTransactionEntryModel';

function makePorts(): TransactionEntryModelPorts {
  return {
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn().mockResolvedValue({
        items: [
          { id: 'account-1', name: 'Checking', type: 'cash', currency: 'USD', status: 'active' },
          { id: 'account-2', name: 'Savings', type: 'cash', currency: 'EUR', status: 'active' },
        ],
      }),
      ledgerGetAccountSummary: vi.fn().mockResolvedValue({
        accountId: 'account-1',
        name: 'Checking',
        type: 'cash',
        currency: 'USD',
        balanceAmount: '100.00',
      }),
      ledgerGetNetWorthByCurrency: vi.fn().mockResolvedValue({ items: [] }),
      ledgerGetCashFlowSeries: vi.fn(),
      ledgerListTransactions: vi.fn(),
      ledgerOpenAccount: vi.fn(),
      ledgerRenameAccount: vi.fn(),
      ledgerArchiveAccount: vi.fn(),
      ledgerRestoreAccount: vi.fn(),
      ledgerDeleteAccount: vi.fn(),
      ledgerRecordExpense: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      ledgerRecordIncome: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      ledgerRecordTransfer: vi.fn().mockResolvedValue({ transferOutId: 'out-1', transferInId: 'in-1' }),
      ledgerRecordTransferFx: vi.fn().mockResolvedValue({ transferOutId: 'out-1', transferInId: 'in-1' }),
      ledgerCreateExpenseDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
      ledgerAddTransactionItem: vi.fn().mockResolvedValue(undefined),
      ledgerPostDraftTransaction: vi.fn().mockResolvedValue(undefined),
      ledgerVoidTransaction: vi.fn(),
    },
    scheduling: {
      schedulingCreateMovement: vi.fn(),
      schedulingUpdateMovement: vi.fn(),
      schedulingDeactivateMovement: vi.fn(),
      schedulingListMovements: vi.fn(),
      movementsGetOverview: vi.fn(),
      movementsListScheduled: vi.fn(),
    },
    expected: {
      expectedCreateMovement: vi.fn(),
      expectedUpdateMovement: vi.fn(),
      expectedListMovements: vi.fn(),
      expectedResolveMovement: vi.fn().mockResolvedValue(undefined),
      expectedDismissMovement: vi.fn(),
    },
    sharing: {
      sharingListPeople: vi.fn().mockResolvedValue({ items: [] }),
      sharingApplyShareToPostedTransaction: vi.fn(),
      sharingGetMovementDetails: vi.fn(),
      sharingListMovementDetails: vi.fn(),
    },
    analytics: {
      analyticsSetMovementIgnored: vi.fn(),
    },
      taxonomy: {
        taxonomyListCategories: vi.fn().mockResolvedValue({ items: [] }),
        taxonomyCreateCategory: vi.fn().mockResolvedValue({ id: 'cat-1' }),
        taxonomyRenameCategory: vi.fn(),
        taxonomyListTags: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyRenameTag: vi.fn(),
      orchestrationCategorizeTransaction: vi.fn().mockResolvedValue({ status: 'assigned' }),
      orchestrationApplyTransactionTags: vi.fn().mockResolvedValue({ status: 'assigned', tagIds: [] }),
      orchestrationListTransactionTaxonomy: vi.fn(),
    },
  };
}

function makeClock(): TransactionEntryModelClock {
  const now = new Date('2026-05-18T10:20:30.000Z');
  return {
    now: () => now,
    todayIso: () => '2026-05-18',
    resolveOccurredAt: (dateInput) => `${dateInput.trim() || '2026-05-18'}T10:20:30.000Z`,
    dayOfMonthFromDateInput: (dateInput) => dateInput.slice(8, 10).replace(/^0/, '') || '18',
    weekDayIsoFromDateInput: () => '1',
    resolveTimeZoneId: () => 'UTC',
  };
}

function makeIdGenerator(ids: string[]): TransactionEntryModelIdGenerator {
  return {
    nextId: vi.fn(() => ids.shift() ?? 'fallback-id'),
  };
}

function formEvent(intent?: 'post' | 'expected'): FormEvent {
  if (!intent) {
    return { preventDefault: vi.fn() } as unknown as FormEvent;
  }
  const submitter = document.createElement('button');
  submitter.name = 'transactionIntent';
  submitter.value = intent;
  return {
    preventDefault: vi.fn(),
    nativeEvent: { submitter },
  } as unknown as FormEvent;
}

describe('useTransactionEntryModel', () => {
  it('accepts injected ports and stays idle when disabled', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: null,
      enabled: false,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    expect(result.current.error).toBe('');
    expect(ports.ledger.ledgerListAccounts).not.toHaveBeenCalled();
    expect(ports.taxonomy.taxonomyListCategories).not.toHaveBeenCalled();
  });

  it('uses injected ids when cloning prefilled items', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator(['split-a', 'split-b']),
      accountId: 'account-1',
      enabled: true,
      prefillRequest: {
        requestId: 1,
        mode: 'expense',
        amount: '30.00',
        date: '2026-05-18',
        splitItems: [
          { id: 'source-a', name: 'Food', amount: '10.00' },
          { id: 'source-b', name: 'Drink', amount: '20.00' },
        ],
      },
    }));

    await waitFor(() => expect(result.current.required.state.splitItems).toHaveLength(2));

    expect(result.current.required.state.splitItems).toEqual([
      { id: 'split-a', name: 'Food', amount: '10.00' },
      { id: 'split-b', name: 'Drink', amount: '20.00' },
    ]);
  });

  it('records an expense using the injected clock for occurredAt', async () => {
    const ports = makePorts();
    const onRecorded = vi.fn();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
      onRecorded,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setAmount('12');
      result.current.provided.commands.setDate('2026-05-14');
      result.current.provided.commands.setNote('Lunch');
    });
    await act(async () => {
      await result.current.provided.commands.submit(formEvent());
    });

    expect(ports.ledger.ledgerRecordExpense).toHaveBeenCalledWith({
      accountId: 'account-1',
      occurredAt: '2026-05-14T10:20:30.000Z',
      amount: '12',
      currency: 'USD',
      description: 'Lunch',
      merchant: 'Lunch',
      categoryId: undefined,
    });
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });

  it('keeps cross-currency transfer FX fields synchronized through composer commands', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('transfer');
    });
    act(() => {
      result.current.provided.commands.setAmount('10');
    });

    expect(result.current.required.state.transferTargetAccountId).toBe('account-2');
    expect(result.current.required.state.transferCrossCurrency).toBe(true);
    expect(result.current.required.state.transferAmountIn).toBe('10.00');

    act(() => {
      result.current.provided.commands.setTransferFxRate('1.5');
    });

    expect(result.current.required.state.transferFxRate).toBe('1.5');
    expect(result.current.required.state.transferAmountIn).toBe('15.00');
  });

  it('splits an amount into equal parts while preserving cents', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator(['split-1', 'split-2', 'split-3']),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.openSplitEditor();
      result.current.provided.commands.splitByParts('10.00', '3');
    });

    expect(result.current.required.state.amount).toBe('');
    expect(result.current.required.state.splitItems).toEqual([
      { id: 'split-1', name: 'Me', amount: '3.33' },
      { id: 'split-2', name: 'Person 2', amount: '3.33' },
      { id: 'split-3', name: 'Person 3', amount: '3.34' },
    ]);

    act(() => {
      result.current.provided.commands.applySplit();
    });

    expect(result.current.required.state.amount).toBe('10.00');
  });

  it('uses the manual items total as the movement amount when applying from an empty amount', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator(['split-1']),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.openSplitEditor();
      result.current.provided.commands.setSplitItemName('Food');
      result.current.provided.commands.setSplitItemAmount('22.00');
    });
    act(() => {
      result.current.provided.commands.addSplitItem();
    });

    expect(result.current.required.state.amount).toBe('');
    expect(result.current.required.state.splitTotal).toBe('22.00');

    act(() => {
      result.current.provided.commands.applySplit();
    });

    expect(result.current.required.state.amount).toBe('22.00');
  });

  it('does not apply items when sharing only includes the current user', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setAmount('10.00');
      result.current.provided.commands.openSplitEditor();
      result.current.provided.commands.selectSplitMode('parts');
      result.current.provided.commands.applySplit();
    });

    expect(result.current.required.state.amount).toBe('10.00');
    expect(result.current.required.state.splitApplied).toBe(false);
    expect(result.current.required.state.splitEnabled).toBe(false);
    expect(result.current.required.state.splitItems).toEqual([]);
  });

  it('uses the nearest scheduler occurrence instead of the manually selected date for recurring movements', async () => {
    const ports = makePorts();
    vi.mocked(ports.scheduling.schedulingCreateMovement).mockResolvedValue({ id: 'scheduled-1' });

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setAmount('37.50');
      result.current.provided.commands.setDate('2026-05-04');
      result.current.provided.commands.openRecurringScheduleEditor();
      result.current.provided.commands.setRecurrenceFrequency('monthly');
      result.current.provided.commands.setRecurrenceDayOfMonth('11');
      result.current.provided.commands.applyRecurringSchedule();
    });

    await waitFor(() => expect(result.current.required.state.date).toBe('2026-06-11'));

    await act(async () => {
      await result.current.provided.commands.submit(formEvent());
    });

    expect(ports.scheduling.schedulingCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      startAt: '2026-06-11T10:20:30.000Z',
      rule: expect.objectContaining({
        frequency: 'monthly',
        dayOfMonth: 11,
      }),
    }));
  });

  it('uses today as schedule base when the date field is empty', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setDate('');
      result.current.provided.commands.openRecurringScheduleEditor();
    });

    expect(result.current.required.state.nextScheduledOccurrenceDate).toBe('2026-05-18');

    act(() => {
      result.current.provided.commands.applyRecurringSchedule();
    });

    expect(result.current.required.state.date).toBe('2026-05-18');
  });

  it('uses a selected master expense category without creating categories', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setAmount('12');
      result.current.provided.commands.setCategoryId('00000000-0000-4000-8000-000000000102');
    });
    await act(async () => {
      await result.current.provided.commands.submit(formEvent());
    });

    expect(ports.taxonomy.taxonomyCreateCategory).not.toHaveBeenCalled();
    expect(ports.ledger.ledgerRecordExpense).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: '00000000-0000-4000-8000-000000000102',
    }));
    expect(ports.taxonomy.orchestrationCategorizeTransaction).not.toHaveBeenCalled();
  });

  it('creates an expected movement from the expected submit action', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
    }));

    await waitFor(() => expect(result.current.required.status.disabled).toBe(false));

    act(() => {
      result.current.provided.commands.open();
      result.current.provided.commands.selectMode('expense');
      result.current.provided.commands.setAmount('12');
      result.current.provided.commands.setDate('2026-05-14');
      result.current.provided.commands.setNote('Lunch');
    });
    await act(async () => {
      await result.current.provided.commands.submit(formEvent('expected'));
    });

    expect(ports.expected.expectedCreateMovement).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'account-1',
      type: 'expense',
      amount: '12.00',
      expectedAt: '2026-05-14T10:20:30.000Z',
      merchant: 'Lunch',
    }));
    expect(ports.ledger.ledgerRecordExpense).not.toHaveBeenCalled();
  });

  it('resolves posted expected movements using the injected clock', async () => {
    const ports = makePorts();

    const { result } = renderHook(() => useTransactionEntryModel({
      ports,
      clock: makeClock(),
      idGenerator: makeIdGenerator([]),
      accountId: 'account-1',
      enabled: true,
      prefillRequest: {
        requestId: 1,
        mode: 'expense',
        amount: '15.00',
        date: '2026-05-14',
        note: 'Expected lunch',
        postExpectedMovementId: 'expected-1',
      },
    }));

    await waitFor(() => expect(result.current.required.state.open).toBe(true));

    await act(async () => {
      await result.current.provided.commands.submit(formEvent());
    });

    expect(ports.expected.expectedResolveMovement).toHaveBeenCalledWith({
      expectedMovementId: 'expected-1',
      transactionId: 'tx-1',
      resolvedAt: '2026-05-18T10:20:30.000Z',
    });
  });
});
