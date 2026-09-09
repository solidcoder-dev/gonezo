import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementReuseSuggestionsPort } from '../../movements/application/movementReuseSuggestions.port';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

const group = (title: string) => ({
  title,
  normalizedTitle: title.toLowerCase(),
  variantCount: 1,
  primaryVariant: {
    representativeMovementId: title,
    accountId: 'account-1', accountName: 'Main', financialType: 'expense' as const,
    tags: [], itemCount: 0, shareCount: 0, usageCount: 1, lastUsedAt: '2026-01-01', deterministicKey: title,
  },
});

function createPort() {
  return { movementReuseSearchGroups: vi.fn(), movementReuseListVariants: vi.fn() } satisfies MovementReuseSuggestionsPort;
}

describe('useMovementReuseSuggestionsModel request lifecycle', () => {
  it('does not apply a response after the session closes', async () => {
    vi.useFakeTimers();
    const port = createPort();
    let resolveSearch: ((value: { groups: ReturnType<typeof group>[] }) => void) | undefined;
    port.movementReuseSearchGroups.mockReturnValue(new Promise((resolve) => { resolveSearch = resolve; }));
    const { result } = renderHook(() => useMovementReuseSuggestionsModel({ port, accountIds: ['account-1'], query: 'merc', enabled: true }));
    act(() => result.current.actions.activate());
    act(() => { vi.advanceTimersByTime(250); });
    await act(async () => { result.current.actions.close(); });
    await act(async () => { resolveSearch?.({ groups: [group('Mercadona')] }); });
    expect(result.current.state.open).toBe(false);
    expect(result.current.state.groups).toEqual([]);
    vi.useRealTimers();
  });

  it('keeps an old variants response from repopulating a closed group', async () => {
    const port = createPort();
    let resolveVariants: ((value: { variants: [] }) => void) | undefined;
    port.movementReuseListVariants.mockReturnValue(new Promise((resolve) => { resolveVariants = resolve; }));
    const { result } = renderHook(() => useMovementReuseSuggestionsModel({ port, accountIds: ['account-1'], query: 'merc', enabled: true }));
    act(() => result.current.actions.activate());
    await act(async () => { void result.current.actions.toggleGroup({ ...group('Mercadona'), variantCount: 2 }); });
    await act(async () => { result.current.actions.close(); });
    await act(async () => { resolveVariants?.({ variants: [] }); });
    expect(result.current.state.open).toBe(false);
    expect(result.current.state.expandedTitle).toBeNull();
    expect(result.current.state.variants).toEqual([]);
  });

  it('applies variants returned for the expanded group', async () => {
    const port = createPort();
    const variant = { ...group('Mercadona').primaryVariant, representativeMovementId: 'variant-2', deterministicKey: 'variant-2' };
    port.movementReuseListVariants.mockResolvedValue({ variants: [variant] });
    const { result } = renderHook(() => useMovementReuseSuggestionsModel({ port, accountIds: ['account-1'], query: 'merc', enabled: true }));

    await act(async () => { await result.current.actions.toggleGroup({ ...group('Mercadona'), variantCount: 2 }); });

    expect(result.current.state.expandedTitle).toBe('mercadona');
    expect(result.current.state.variants).toEqual([variant]);
  });
});
