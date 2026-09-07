import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceAccountEvents } from './useWorkspaceAccountEvents';

describe('useWorkspaceAccountEvents', () => {
  it('refreshes account consumers after account mutation and deletion', () => {
    const refresh = vi.fn();
    const input = {
      selectedAccountId: null,
      setAccountsCount: vi.fn(),
      setSelectedAccountId: vi.fn(),
      refresh,
    };
    const { result } = renderHook(() => useWorkspaceAccountEvents(input));

    act(() => result.current.handleAccountMutated());
    expect(refresh).toHaveBeenLastCalledWith(
      'accountHub',
      'accountSummary',
      'netWorth',
      'movementQuickAction',
      'expectedMovements',
      'analytics',
    );

    act(() => result.current.handleAccountDeleted('account-1'));
    expect(refresh).toHaveBeenLastCalledWith(
      'accountHub',
      'accountSummary',
      'netWorth',
      'recentTransactions',
      'movementQuickAction',
      'expectedMovements',
      'analytics',
    );
  });
});
