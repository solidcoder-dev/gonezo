import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountHubModelPorts } from './useAccountHubModel';
import { useAccountHubModel } from './useAccountHubModel';

function account(input: Partial<Awaited<ReturnType<AccountHubModelPorts['ledger']['ledgerListAccounts']>>['items'][number]> & { id: string; name: string }) {
  return {
    id: input.id,
    name: input.name,
    type: input.type ?? 'cash',
    currency: input.currency ?? 'USD',
    status: input.status ?? 'active',
  };
}

function makePorts(overrides: Partial<AccountHubModelPorts> = {}): AccountHubModelPorts {
  return {
    ledger: {
      ledgerListSupportedCurrencies: vi.fn().mockResolvedValue({ items: ['USD'] }),
      ledgerListAccounts: vi.fn().mockResolvedValue({ items: [] }),
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
    preferences: {
      preferencesGet: vi.fn().mockResolvedValue({ defaultAccountId: null }),
      preferencesSetDefaultAccount: vi.fn(),
      preferencesClearDefaultAccount: vi.fn(),
    },
    ...overrides,
  };
}

describe('useAccountHubModel', () => {
  it('loads accounts, filters deleted accounts and selects the default active account', async () => {
    const events = {
      onAccountsCountChanged: vi.fn(),
      onSelectedAccountChanged: vi.fn(),
      onLoadPhaseChanged: vi.fn(),
      onError: vi.fn(),
    };
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerListSupportedCurrencies: vi.fn().mockResolvedValue({ items: ['USD', 'EUR'] }),
        ledgerListAccounts: vi.fn().mockResolvedValue({
          items: [
            account({ id: 'a', name: 'Checking' }),
            account({ id: 'b', name: 'Savings' }),
            account({ id: 'arch', name: 'Archived', status: 'archived' }),
            account({ id: 'deleted', name: 'Deleted', status: 'deleted' }),
          ],
        }),
      },
      preferences: {
        ...makePorts().preferences,
        preferencesGet: vi.fn().mockResolvedValue({ defaultAccountId: 'b' }),
      },
    });

    const { result } = renderHook(() => useAccountHubModel({
      ports,
      refreshSignal: false,
      events,
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.accounts.map((item) => item.id)).toEqual(['a', 'b', 'arch']);
    expect(result.current.state.selectedAccountId).toBe('b');
    expect(result.current.state.defaultAccountId).toBe('b');
    expect(result.current.state.supportedCurrencies).toEqual(['USD', 'EUR']);
    expect(events.onAccountsCountChanged).toHaveBeenCalledWith(2);
    expect(events.onSelectedAccountChanged).toHaveBeenCalledWith('b');
    expect(events.onLoadPhaseChanged).toHaveBeenNthCalledWith(1, 'loading');
    expect(events.onLoadPhaseChanged).toHaveBeenNthCalledWith(2, 'ready');
    expect(events.onError).not.toHaveBeenCalled();
  });

  it('validates and creates accounts through commands', async () => {
    const openAccount = vi.fn().mockResolvedValue({ id: 'new-account' });
    const ledgerListAccounts = vi.fn()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [account({ id: 'new-account', name: 'Cash' })] });
    const events = {
      onSelectedAccountChanged: vi.fn(),
    };
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerListSupportedCurrencies: vi.fn().mockResolvedValue({ items: ['USD'] }),
        ledgerListAccounts,
        ledgerOpenAccount: openAccount,
      },
    });

    const { result } = renderHook(() => useAccountHubModel({
      ports,
      refreshSignal: false,
      events,
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      result.current.commands.setCreateName('');
    });
    await act(async () => {
      await result.current.commands.submitCreateAccount({ preventDefault: vi.fn() });
    });
    expect(result.current.state.error).toBe('Account name is required.');
    expect(openAccount).not.toHaveBeenCalled();

    await act(async () => {
      result.current.commands.setCreateName('Cash');
      result.current.commands.setCreateOpeningBalance('10.50');
      result.current.commands.openCreateForm();
    });
    await act(async () => {
      await result.current.commands.submitCreateAccount({ preventDefault: vi.fn() });
    });

    expect(openAccount).toHaveBeenCalledWith({
      name: 'Cash',
      type: 'cash',
      currency: 'USD',
      openingBalanceAmount: '10.50',
    });
    expect(result.current.state.selectedAccountId).toBe('new-account');
    expect(result.current.state.createOpeningBalance).toBe('');
    expect(result.current.state.createFormOpen).toBe(false);
    expect(events.onSelectedAccountChanged).toHaveBeenLastCalledWith('new-account');
  });
});
