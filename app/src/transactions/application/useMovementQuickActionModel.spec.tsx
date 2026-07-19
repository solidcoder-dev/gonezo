import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
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

  it('requests a default expense for the favorite account directly', async () => {
    const onCreateMovementRequested = vi.fn();
    const ports = makePorts();
    const { result } = renderHook(() => useMovementQuickActionModel({
      ports,
      enabled: true,
      events: { onCreateMovementRequested },
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => {
      result.current.provided.commands.openDraft();
    });

    expect(onCreateMovementRequested).toHaveBeenCalledWith({
      account: { id: 'acc-2', name: 'billetera' },
      type: 'expense',
    });
    expect(result.current.required.state.draftOpen).toBe(false);
    expect(result.current.required.state.selectedAccountId).toBe('acc-2');
    expect(result.current.required.state.selectedMovementType).toBe('expense');
  });

  it('replays a pending add request once the initial accounts load completes', async () => {
    const onCreateMovementRequested = vi.fn();
    let resolveAccounts: ((value: { items: LedgerAccountItem[] }) => void) | undefined;
    const ports = makePorts({
      ledger: {
        ledgerListAccounts: vi.fn(() => new Promise<{ items: LedgerAccountItem[] }>((resolve) => {
          resolveAccounts = resolve;
        })),
      },
    });
    const { result } = renderHook(() => useMovementQuickActionModel({
      ports,
      enabled: true,
      events: { onCreateMovementRequested },
    }));

    act(() => {
      result.current.provided.commands.openDraft();
    });

    expect(onCreateMovementRequested).not.toHaveBeenCalled();

    resolveAccounts?.({
      items: [
        { id: 'acc-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
        { id: 'acc-2', name: 'billetera', type: 'cash', currency: 'EUR', status: 'active' },
      ],
    });

    await waitFor(() => expect(onCreateMovementRequested).toHaveBeenCalledWith({
      account: { id: 'acc-2', name: 'billetera' },
      type: 'expense',
    }));
  });

  it('keeps legacy local draft commands available for restored draft requests', async () => {
    const onCreateMovementRequested = vi.fn();
    const ports = makePorts();
    const { result } = renderHook(() => useMovementQuickActionModel({
      ports,
      enabled: true,
      events: { onCreateMovementRequested },
    }));

    await waitFor(() => expect(result.current.required.status.loading).toBe(false));

    act(() => result.current.provided.commands.selectAccount('acc-1'));
    act(() => result.current.provided.commands.selectMovementType('income'));

    expect(result.current.required.state.selectedAccountId).toBe('acc-1');
    expect(result.current.required.state.selectedAccountName).toBe('Main');
    expect(result.current.required.state.selectedMovementType).toBe('income');
    expect(result.current.required.state.accountSelectorOpen).toBe(false);
    expect(onCreateMovementRequested).not.toHaveBeenCalled();

    act(() => {
      result.current.provided.commands.expandDraft();
    });

    expect(onCreateMovementRequested).toHaveBeenCalledWith({
      account: { id: 'acc-1', name: 'Main' },
      type: 'income',
    });
    expect(result.current.required.state.draftOpen).toBe(false);
    expect(result.current.required.state.selectedAccountId).toBe('acc-2');
    expect(result.current.required.state.selectedMovementType).toBe('expense');
  });
});
