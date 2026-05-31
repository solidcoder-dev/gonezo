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

function formEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent;
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

  it('uses injected ids when cloning prefilled split items', async () => {
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
      result.current.provided.commands.setSplitEnabled(true);
      result.current.provided.commands.splitByParts('10.00', '3');
    });

    expect(result.current.required.state.amount).toBe('10.00');
    expect(result.current.required.state.splitItems).toEqual([
      { id: 'split-1', name: 'Part 1', amount: '3.33' },
      { id: 'split-2', name: 'Part 2', amount: '3.33' },
      { id: 'split-3', name: 'Part 3', amount: '3.34' },
    ]);
  });

  it('creates a missing expense category before recording a posted expense', async () => {
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
      result.current.provided.commands.setCategoryInput('Food');
    });
    await act(async () => {
      await result.current.provided.commands.submit(formEvent());
    });

    expect(ports.taxonomy.taxonomyCreateCategory).toHaveBeenCalledWith({
      name: 'Food',
      appliesTo: 'expense',
    });
    expect(ports.ledger.ledgerRecordExpense).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: 'cat-1',
    }));
    expect(ports.taxonomy.orchestrationCategorizeTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      transactionType: 'expense',
      categoryId: 'cat-1',
    });
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
