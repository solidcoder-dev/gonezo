import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

describe('useMovementReuseSuggestionsModel', () => {
  it('does not search while idle when account scope changes, then refreshes an active search', () => {
    vi.useFakeTimers();
    const port = {
      movementReuseSearchGroups: vi.fn().mockResolvedValue({ groups: [] }),
      movementReuseListVariants: vi.fn(),
    };
    const { result, rerender } = renderHook(({ accountIds }) => useMovementReuseSuggestionsModel({
      port, accountIds, query: 'merc', enabled: true,
    }), { initialProps: { accountIds: ['main'] } });

    rerender({ accountIds: ['savings'] });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).not.toHaveBeenCalled();

    act(() => result.current.actions.beginSearch());
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).toHaveBeenCalledTimes(1);
    rerender({ accountIds: ['shared'] });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('debounces queries and ignores stale responses', async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: { groups: [] }) => void> = [];
    const port = {
      movementReuseSearchGroups: vi.fn(() => new Promise<{ groups: [] }>((resolve) => resolvers.push(resolve))),
      movementReuseListVariants: vi.fn(),
    };
    const { result, rerender } = renderHook(({ query, accountIds }) => useMovementReuseSuggestionsModel({ port, accountIds, query, enabled: true }), { initialProps: { query: '', accountIds: ['main'] } });
    rerender({ query: 'merc', accountIds: ['main'] });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).not.toHaveBeenCalled();
    act(() => result.current.actions.beginSearch());
    rerender({ query: 'm', accountIds: ['main'] });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).not.toHaveBeenCalled();
    rerender({ query: 'me', accountIds: ['main'] });
    act(() => { vi.advanceTimersByTime(250); });
    rerender({ query: 'mer', accountIds: ['main'] });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).toHaveBeenCalledTimes(2);
    resolvers[0]({ groups: [] });
    resolvers[1]({ groups: [] });
    await Promise.resolve();
    vi.useRealTimers();
  });
});
