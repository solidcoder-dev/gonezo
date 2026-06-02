import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpenseSplitEditorView } from './ExpenseSplitEditorView';

describe('ExpenseSplitEditorView', () => {
  it('renders enabled split editor and dispatches item commands', () => {
    const toggleEnabled = vi.fn();
    const changeItemName = vi.fn();
    const changeItemAmount = vi.fn();
    const addItem = vi.fn(() => true);
    const assignRemaining = vi.fn();
    const splitByParts = vi.fn();
    const editItem = vi.fn();
    const removeItem = vi.fn();
    const startItem = vi.fn();
    const cancelItem = vi.fn();
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
            editingItemId: '',
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
            splitByParts,
            editItem,
            removeItem,
            startItem,
            cancelItem,
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Split into items')).toBeChecked();
    expect(screen.getByText('Remaining: 0.00 USD')).toHaveClass('success');
    expect(screen.getByRole('list', { name: 'Expense items' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Split into items'));
    fireEvent.click(screen.getByRole('button', { name: 'Add split item' }));
    expect(screen.getByRole('dialog', { name: 'New split item' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Expected repayment')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ignore in analytics')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Tea' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));
    fireEvent.click(screen.getByRole('button', { name: 'Split by parts' }));
    expect(screen.getByRole('dialog', { name: 'Split by parts' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Amount to split'), { target: { value: '9.00' } });
    fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    expect(row).toHaveClass('split-manager-item');
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Item actions for Coffee' }));
    const menu = screen.getByRole('menu', { name: 'Item actions for Coffee' });
    expect(row).not.toContainElement(menu);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit item Coffee' }));
    expect(screen.getByRole('dialog', { name: 'Edit split item' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel split item edit' }));
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Item actions for Coffee' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove item Coffee' }));

    expect(toggleEnabled).toHaveBeenCalledTimes(1);
    expect(startItem).toHaveBeenCalledTimes(1);
    expect(changeItemName).toHaveBeenCalledWith('Tea');
    expect(changeItemAmount).toHaveBeenCalledWith('2.50');
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(assignRemaining).toHaveBeenCalledTimes(1);
    expect(splitByParts).toHaveBeenCalledWith('9.00', '3');
    expect(editItem).toHaveBeenCalledWith('item-1');
    expect(cancelItem).toHaveBeenCalledTimes(1);
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
            editingItemId: '',
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
            addItem: vi.fn(() => false),
            assignRemaining: vi.fn(),
            splitByParts: vi.fn(),
            editItem: vi.fn(),
            removeItem: vi.fn(),
            startItem: vi.fn(),
            cancelItem: vi.fn(),
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
