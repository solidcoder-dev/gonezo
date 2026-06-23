import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { TransactionFieldErrors } from './transactions.types';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';

function renderSplitModel(initialAmount = '100.00') {
  let nextIdNumber = 1;
  return renderHook(() => {
    const [amount] = useState(initialAmount);
    const [, setFieldErrors] = useState<TransactionFieldErrors>({});
    const model = useExpenseSplitEditorModel({
      transactionAmount: amount,
      nextId: vi.fn(() => `item-${nextIdNumber++}`),
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

  it('replaces previous part split instead of appending duplicate parts', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.splitExpenseByParts('100.00', '2');
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-1', name: 'Part 1', amount: '50.00' },
      { id: 'item-2', name: 'Part 2', amount: '50.00' },
    ]);
    expect(result.current.model.state.expenseSplitTotal).toBe('100.00');

    act(() => {
      result.current.model.actions.splitExpenseByParts('100.00', '2');
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-3', name: 'Part 1', amount: '50.00' },
      { id: 'item-4', name: 'Part 2', amount: '50.00' },
    ]);
    expect(result.current.model.state.expenseSplitTotal).toBe('100.00');
  });

  it('keeps item and part drafts independent when switching modes', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.setExpenseItemNameValue('Cafe');
      result.current.model.actions.setExpenseItemAmountValue('10.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-1', name: 'Cafe', amount: '10.00' },
    ]);

    act(() => {
      result.current.model.actions.splitExpenseByParts('100.00', '2');
    });

    expect(result.current.model.state.splitDraftMode).toBe('parts');
    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-2', name: 'Part 1', amount: '50.00' },
      { id: 'item-3', name: 'Part 2', amount: '50.00' },
    ]);

    act(() => {
      result.current.model.actions.setSplitDraftMode('items');
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-1', name: 'Cafe', amount: '10.00' },
    ]);
  });

  it('adjusts the other parts when editing one part amount', () => {
    const { result } = renderSplitModel('100.00');

    act(() => {
      result.current.model.actions.splitExpenseByParts('100.00', '4');
    });
    act(() => {
      result.current.model.actions.editExpenseItem('item-1');
    });
    act(() => {
      result.current.model.actions.setExpenseItemAmountValue('40.00');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-1', name: 'Part 1', amount: '40.00' },
      { id: 'item-2', name: 'Part 2', amount: '20.00' },
      { id: 'item-3', name: 'Part 3', amount: '20.00' },
      { id: 'item-4', name: 'Part 4', amount: '20.00' },
    ]);
    expect(result.current.model.state.expenseSplitTotal).toBe('100.00');
  });

  it('keeps part split cents balanced when edited amount leaves a remainder', () => {
    const { result } = renderSplitModel('10.00');

    act(() => {
      result.current.model.actions.splitExpenseByParts('10.00', '3');
    });
    act(() => {
      result.current.model.actions.editExpenseItem('item-1');
    });
    act(() => {
      result.current.model.actions.setExpenseItemAmountValue('3.34');
    });
    act(() => {
      result.current.model.actions.addExpenseItem();
    });

    expect(result.current.model.state.expenseItems).toEqual([
      { id: 'item-1', name: 'Part 1', amount: '3.34' },
      { id: 'item-2', name: 'Part 2', amount: '3.33' },
      { id: 'item-3', name: 'Part 3', amount: '3.33' },
    ]);
    expect(result.current.model.state.expenseSplitTotal).toBe('10.00');
  });
});
