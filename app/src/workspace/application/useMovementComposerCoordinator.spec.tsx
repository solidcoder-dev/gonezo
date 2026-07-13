import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMovementComposerCoordinator } from './useMovementComposerCoordinator';

describe('useMovementComposerCoordinator', () => {
  it('opens the existing composer for a reviewed voice draft', () => {
    const { result } = renderHook(() => useMovementComposerCoordinator({ selectedAccountId: 'acc-default' }));

    act(() => {
      result.current.actions.createMovementForDraft({
        account: { id: 'acc-voice', name: 'Checking', currency: 'EUR' },
        draft: {
          type: 'income',
          amount: '1250.00',
          occurredOn: '2026-07-14',
          note: 'Salary',
          categoryId: 'cat-salary',
          issues: [],
        },
      });
    });

    expect(result.current.state.transactionEntryAccountId).toBe('acc-voice');
    expect(result.current.state.movementEntryType).toBe('income');
    expect(result.current.state.transactionEntryPrefill).toEqual(expect.objectContaining({
      mode: 'income',
      amount: '1250.00',
      date: '2026-07-14',
      note: 'Salary',
      categoryId: 'cat-salary',
    }));
    expect(result.current.state.movementEntryOpenSignal).toBe(1);
  });
});
