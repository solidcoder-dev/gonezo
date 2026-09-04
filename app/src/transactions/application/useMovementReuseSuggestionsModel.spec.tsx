import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovementReuseSuggestionsModel } from './useMovementReuseSuggestionsModel';

describe('useMovementReuseSuggestionsModel', () => {
  it('debounces queries and ignores stale responses', async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: { groups: [] }) => void> = [];
    const port = {
      movementReuseSearchGroups: vi.fn(() => new Promise<{ groups: [] }>((resolve) => resolvers.push(resolve))),
      movementReuseListVariants: vi.fn(),
    };
    const { rerender } = renderHook(({ query }) => useMovementReuseSuggestionsModel({ port, accountIds: ['main'], query, enabled: true }), { initialProps: { query: '' } });
    rerender({ query: 'm' });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).not.toHaveBeenCalled();
    rerender({ query: 'me' });
    act(() => { vi.advanceTimersByTime(250); });
    rerender({ query: 'mer' });
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).toHaveBeenCalledTimes(2);
    resolvers[0]({ groups: [] });
    resolvers[1]({ groups: [] });
    await Promise.resolve();
    vi.useRealTimers();
  });
});
