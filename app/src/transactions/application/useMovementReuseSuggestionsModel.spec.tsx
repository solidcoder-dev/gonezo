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
    const { result } = renderHook(() => useMovementReuseSuggestionsModel({ port, accountIds: ['main'], enabled: true }));
    act(() => result.current.actions.changeQuery('m'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).not.toHaveBeenCalled();
    act(() => result.current.actions.changeQuery('me'));
    act(() => { vi.advanceTimersByTime(250); });
    act(() => result.current.actions.changeQuery('mer'));
    act(() => { vi.advanceTimersByTime(250); });
    expect(port.movementReuseSearchGroups).toHaveBeenCalledTimes(2);
    resolvers[0]({ groups: [] });
    resolvers[1]({ groups: [] });
    await Promise.resolve();
    vi.useRealTimers();
  });
});
