import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountsCorePort } from './accountsCore.port';
import { useAccountSummaryModel } from './useAccountSummaryModel';

function makeCore(overrides: Partial<AccountsCorePort>): AccountsCorePort {
  return {
    ledgerListSupportedCurrencies: vi.fn(),
    ledgerListAccounts: vi.fn(),
    ledgerGetAccountSummary: vi.fn().mockResolvedValue({
      accountId: 'account-1',
      name: 'Checking',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '12.00',
    }),
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
    preferencesGet: vi.fn(),
    preferencesSetDefaultAccount: vi.fn(),
    preferencesClearDefaultAccount: vi.fn(),
    ...overrides,
  } as AccountsCorePort;
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
    const core = makeCore({
      ledgerGetAccountSummary,
      ledgerRenameAccount: renameAccount,
    });

    const { result } = renderHook(() => useAccountSummaryModel({
      core,
      accountId: 'account-1',
      enabled: true,
      refreshSignal: false,
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
    const core = makeCore({});

    const { result } = renderHook(() => useAccountSummaryModel({
      core,
      accountId: null,
      enabled: false,
      refreshSignal: false,
    }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.summary).toBeNull();
    expect(core.ledgerGetAccountSummary).not.toHaveBeenCalled();
  });
});
