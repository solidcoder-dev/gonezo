import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountSummaryModelPorts } from './useAccountSummaryModel';
import { useAccountSummaryModel } from './useAccountSummaryModel';

function makePorts(overrides: Partial<AccountSummaryModelPorts> = {}): AccountSummaryModelPorts {
  return {
    ledger: {
      ledgerListSupportedCurrencies: vi.fn(),
      ledgerListAccounts: vi.fn(),
      ledgerGetAccountSummary: vi.fn().mockResolvedValue({
        accountId: 'account-1',
        name: 'Checking',
        type: 'cash',
        currency: 'USD',
        balanceAmount: '12.00',
      }),
      ledgerGetNetWorthByCurrency: vi.fn().mockResolvedValue({ items: [] }),
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
    ...overrides,
  };
}

describe('useAccountSummaryModel', () => {
  it('loads summary and renames the account through commands', async () => {
    const renameAccount = vi.fn().mockResolvedValue(undefined);
    const ledgerGetAccountSummary = vi.fn()
      .mockResolvedValueOnce({
        accountId: 'account-1',
        name: 'Checking',
        type: 'cash',
        currency: 'USD',
        balanceAmount: '12.00',
      })
      .mockResolvedValueOnce({
        accountId: 'account-1',
        name: 'Main checking',
        type: 'cash',
        currency: 'USD',
        balanceAmount: '12.00',
      });
    const events = {
      onAccountMutated: vi.fn(),
      onError: vi.fn(),
    };
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerGetAccountSummary,
        ledgerRenameAccount: renameAccount,
      },
    });

    const { result } = renderHook(() => useAccountSummaryModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      confirm: vi.fn().mockReturnValue(true),
      events,
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.summary?.name).toBe('Checking');

    act(() => {
      result.current.commands.openManage();
      result.current.commands.setManageName('Main checking');
    });
    await act(async () => {
      await result.current.commands.submitRename({ preventDefault: vi.fn() });
    });

    expect(renameAccount).toHaveBeenCalledWith({ accountId: 'account-1', name: 'Main checking' });
    expect(result.current.state.summary?.name).toBe('Main checking');
    expect(result.current.state.manageOpen).toBe(false);
    expect(events.onAccountMutated).toHaveBeenCalledWith('account-1');
    expect(events.onError).not.toHaveBeenCalled();
  });

  it('returns an empty state when disabled or missing account id', async () => {
    const ports = makePorts({});

    const { result } = renderHook(() => useAccountSummaryModel({
      ports,
      accountId: null,
      enabled: false,
      refreshSignal: false,
      confirm: vi.fn().mockReturnValue(true),
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.summary).toBeNull();
    expect(ports.ledger.ledgerGetAccountSummary).not.toHaveBeenCalled();
  });

  it('uses the injected confirmation before archiving or deleting an account', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    const archiveAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const ports = makePorts({
      ledger: {
        ...makePorts().ledger,
        ledgerArchiveAccount: archiveAccount,
        ledgerDeleteAccount: deleteAccount,
      },
    });

    const { result } = renderHook(() => useAccountSummaryModel({
      ports,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
      confirm,
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.commands.archiveAccount();
      await result.current.commands.deleteAccount();
    });

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(archiveAccount).not.toHaveBeenCalled();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
