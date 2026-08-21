import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTransactionEntryOpenSignal } from './useTransactionEntryOpenSignal';

describe('useTransactionEntryOpenSignal', () => {
  it('does not replay a stale signal when the account becomes available', () => {
    const open = vi.fn();
    const { rerender } = renderHook<void, { accountId: string | null }>(
      ({ accountId }: { accountId: string | null }) => useTransactionEntryOpenSignal(1, true, accountId, open),
      { initialProps: { accountId: null } },
    );

    rerender({ accountId: 'account-1' });

    expect(open).not.toHaveBeenCalled();
  });

  it('opens once when a new signal arrives while the account is available', () => {
    const open = vi.fn();
    const { rerender } = renderHook(
      ({ openSignal }: { openSignal: number }) => useTransactionEntryOpenSignal(openSignal, true, 'account-1', open),
      { initialProps: { openSignal: 0 } },
    );

    act(() => {
      rerender({ openSignal: 1 });
      rerender({ openSignal: 1 });
    });

    expect(open).toHaveBeenCalledTimes(1);
  });
});
