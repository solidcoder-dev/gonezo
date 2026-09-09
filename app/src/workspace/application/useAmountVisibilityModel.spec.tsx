import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import { useAmountVisibilityModel } from './useAmountVisibilityModel';

type TestAmountVisibilityPort = { load: () => Promise<AmountVisibility>; save: (value: AmountVisibility) => Promise<void>; saves: AmountVisibility[] };

function createPort(loaded: AmountVisibility = 'visible'): TestAmountVisibilityPort {
  const saves: AmountVisibility[] = [];
  return {
    saves,
    load: vi.fn(async () => loaded),
    save: vi.fn(async (value: AmountVisibility) => { saves.push(value); }),
  };
}

describe('useAmountVisibilityModel', () => {
  it('starts hidden while loading and then exposes the stored preference', async () => {
    const port = createPort('visible');
    const { result } = renderHook(() => useAmountVisibilityModel({ port }));
    expect(result.current.state).toMatchObject({ loading: true, visibility: 'hidden' });
    await waitFor(() => expect(result.current.state).toMatchObject({ loading: false, visibility: 'visible' }));
  });

  it('keeps amounts hidden when loading fails', async () => {
    const port = createPort();
    port.load = vi.fn(async () => { throw new Error('read failed'); });
    const onError = vi.fn();
    const { result } = renderHook(() => useAmountVisibilityModel({ port, events: { onError } }));
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.visibility).toBe('hidden');
    expect(onError).toHaveBeenCalledWith({ message: 'read failed' });
  });

  it('updates immediately and does not start concurrent saves', async () => {
    const port = createPort('hidden');
    let resolveSave!: () => void;
    port.save = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    const { result } = renderHook(() => useAmountVisibilityModel({ port }));
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    act(() => {
      void result.current.commands.toggleAmountVisibility();
      void result.current.commands.toggleAmountVisibility();
    });

    expect(result.current.state.visibility).toBe('visible');
    expect(port.save).toHaveBeenCalledTimes(1);
    resolveSave();
    await waitFor(() => expect(result.current.state.saving).toBe(false));
  });

  it('keeps the chosen visibility after a save failure and reports it', async () => {
    const port = createPort('hidden');
    port.save = vi.fn(async () => { throw new Error('write failed'); });
    const onError = vi.fn();
    const { result } = renderHook(() => useAmountVisibilityModel({ port, events: { onError } }));
    await waitFor(() => expect(result.current.state.loading).toBe(false));
    await act(async () => { await result.current.commands.toggleAmountVisibility(); });
    expect(result.current.state.visibility).toBe('visible');
    expect(result.current.state.error).toBe('write failed');
    expect(onError).toHaveBeenCalledWith({ message: 'write failed' });
  });

  it('does not apply a load response after unmount', async () => {
    let resolveLoad!: (value: AmountVisibility) => void;
    const port = createPort();
    port.load = vi.fn(() => new Promise<AmountVisibility>((resolve) => { resolveLoad = resolve; }));
    const { result, unmount } = renderHook(() => useAmountVisibilityModel({ port }));
    unmount();
    resolveLoad('visible');
    await Promise.resolve();
    expect(result.current.state.visibility).toBe('hidden');
  });
});
