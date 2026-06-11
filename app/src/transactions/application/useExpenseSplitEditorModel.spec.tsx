import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { TransactionFieldErrors } from './transactions.types';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';

function renderSplitModel(initialAmount = '100.00') {
  const ids = ['item-1', 'item-2', 'item-3'];
  return renderHook(() => {
    const [amount] = useState(initialAmount);
    const [, setFieldErrors] = useState<TransactionFieldErrors>({});
    const model = useExpenseSplitEditorModel({
      transactionAmount: amount,
      nextId: vi.fn(() => ids.shift() ?? 'fallback-id'),
      setFieldErrors,
    });
    return { amount, model };
  });
}

describe('useExpenseSplitEditorModel', () => {
  it('keeps movement amount unchanged when adding split items', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.setExpenseItemNameValue('Food');
      result.current.model.actions.setExpenseItemAmountValue('60.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });

    expect(result.current.amount).toBe('100.00');
    expect(result.current.model.state.expenseRemaining).toBe('40.00');
  });

  it('keeps movement amount unchanged when removing split items', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.setExpenseItemNameValue('Food');
      result.current.model.actions.setExpenseItemAmountValue('60.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });
    act(() => {
      result.current.model.actions.setExpenseItemNameValue('Drinks');
      result.current.model.actions.setExpenseItemAmountValue('40.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });

    act(() => {
      result.current.model.actions.removeExpenseItem('item-1');
    });

    expect(result.current.amount).toBe('100.00');
    expect(result.current.model.state.expenseRemaining).toBe('60.00');
  });

  it('applies and removes a split without changing the movement amount', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.openSplitEditor();
    });
    act(() => {
      result.current.model.actions.setExpenseItemNameValue('Food');
      result.current.model.actions.setExpenseItemAmountValue('60.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });
    act(() => {
      result.current.model.actions.applySplit();
    });

    expect(result.current.amount).toBe('100.00');
    expect(result.current.model.state.splitApplied).toBe(true);
    expect(result.current.model.state.expenseDetailed).toBe(true);
    expect(result.current.model.state.expenseSplitTotal).toBe('60.00');

    act(() => {
      result.current.model.actions.removeSplit();
    });

    expect(result.current.amount).toBe('100.00');
    expect(result.current.model.state.splitApplied).toBe(false);
    expect(result.current.model.state.expenseDetailed).toBe(false);
    expect(result.current.model.state.expenseItems).toHaveLength(0);
  });
});
