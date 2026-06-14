import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovementQuickActionModel } from './useMovementQuickActionModel';
import type { MovementQuickActionModelPorts } from './useMovementQuickActionModel';

function makePorts(overrides: Partial<MovementQuickActionModelPorts> = {}): MovementQuickActionModelPorts {
  return {
    ledger: {
      ledgerListAccounts: vi.fn(async () => ({
        items: [
          { id: 'acc-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
          { id: 'acc-2', name: 'billetera', type: 'cash', currency: 'EUR', status: 'active' },
        ],
      })),
    },
    preferences: {
      preferencesGet: vi.fn(async () => ({ defaultAccountId: 'acc-2' })),
    },
    ...overrides,
  };
}

describe('useMovementQuickActionModel', () => {
  it('uses the default account as the initial account for new movements', async () => {
    const ports = makePorts();
    const { result } = renderHook(() => useMovementQuickActionModel({ ports, enabled: true }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    expect(result.current.required.state.selectedAccountId).toBe('acc-2');
    expect(result.current.required.state.selectedAccountName).toBe('billetera');
  });

  it('selects another account for the next movement without changing the resting favorite', async () => {
    const onCreateMovementRequested = vi.fn();
    const ports = makePorts();
    const { result } = renderHook(() => useMovementQuickActionModel({
      ports,
      enabled: true,
      events: { onCreateMovementRequested },
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.selectAccount('acc-1');
    });

    expect(result.current.required.state.selectedAccountId).toBe('acc-2');
    expect(result.current.required.state.selectedAccountName).toBe('billetera');
    expect(result.current.required.state.accountSelectorOpen).toBe(false);
    expect(onCreateMovementRequested).toHaveBeenCalledWith({ id: 'acc-1', name: 'Main' });

    act(() => {
      result.current.provided.commands.createMovement();
    });

    expect(onCreateMovementRequested).toHaveBeenLastCalledWith({ id: 'acc-2', name: 'billetera' });
  });
});
