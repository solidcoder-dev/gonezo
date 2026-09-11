import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAnalyticsPeriodNavigation } from './useAnalyticsPeriodNavigation';

describe('useAnalyticsPeriodNavigation', () => {
  it('changes the visible label on every previous-period action', () => {
    const { result } = renderHook(() => useAnalyticsPeriodNavigation({ kind: 'thisMonth' }, 0, true));
    const labels = [result.current.currentWindowLabel];

    act(() => result.current.goPrevious());
    labels.push(result.current.currentWindowLabel);
    act(() => result.current.goPrevious());
    labels.push(result.current.currentWindowLabel);
    act(() => result.current.goPrevious());
    labels.push(result.current.currentWindowLabel);

    expect(new Set(labels).size).toBe(4);
  });
});
