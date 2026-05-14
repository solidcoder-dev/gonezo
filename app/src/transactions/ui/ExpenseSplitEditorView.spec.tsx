import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseSplitEditorView } from './ExpenseSplitEditorView';

describe('ExpenseSplitEditorView', () => {
  it('renders enabled split editor and dispatches item commands', () => {
    const toggleEnabled = vi.fn();
    const changeItemName = vi.fn();
    const changeItemAmount = vi.fn();
    const addItem = vi.fn();
    const assignRemaining = vi.fn();
    const editItem = vi.fn();
    const removeItem = vi.fn();
    render(
      <ExpenseSplitEditorView
        required={{
          config: {},
          data: {
            items: [{ id: 'item-1', name: 'Coffee', amount: '4.00' }],
          },
          state: {
            enabled: true,
            itemName: 'Cake',
            itemAmount: '6.00',
            remaining: '0.00',
            currencyCode: 'USD',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            toggleEnabled,
            changeItemName,
            changeItemAmount,
            addItem,
            assignRemaining,
            editItem,
            removeItem,
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Split into items')).toBeChecked();
    expect(screen.getByText('Remaining: 0.00 USD')).toHaveClass('success');
    expect(screen.getByRole('list', { name: 'Expense items' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Split into items'));
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Tea' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Remove' }));

    expect(toggleEnabled).toHaveBeenCalledTimes(1);
    expect(changeItemName).toHaveBeenCalledWith('Tea');
    expect(changeItemAmount).toHaveBeenCalledWith('2.50');
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(assignRemaining).toHaveBeenCalledTimes(1);
    expect(editItem).toHaveBeenCalledWith('item-1');
    expect(removeItem).toHaveBeenCalledWith('item-1');
  });

  it('renders validation feedback and hides editor body when disabled by state', () => {
    render(
      <ExpenseSplitEditorView
        required={{
          config: {},
          data: { items: [] },
          state: {
            enabled: false,
            itemName: '',
            itemAmount: '',
            remaining: '3.00',
            itemNameError: 'Item name is required',
            splitError: 'Split must match amount',
          },
          status: { disabled: true },
        }}
        provided={{
          commands: {
            toggleEnabled: vi.fn(),
            changeItemName: vi.fn(),
            changeItemAmount: vi.fn(),
            addItem: vi.fn(),
            assignRemaining: vi.fn(),
            editItem: vi.fn(),
            removeItem: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Split into items')).toBeDisabled();
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument();
    expect(screen.queryByText('Item name is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Split must match amount')).not.toBeInTheDocument();
  });
});
