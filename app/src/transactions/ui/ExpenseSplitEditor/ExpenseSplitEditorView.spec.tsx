import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import splitStyles from '../../../shared/ui/SplitManager/SplitManager.module.css';
import { ExpenseSplitEditorView } from './ExpenseSplitEditorView';

describe('ExpenseSplitEditorView', () => {
  it('renders enabled split editor and dispatches item commands', () => {
    const toggleEnabled = vi.fn();
    const changeItemName = vi.fn();
    const changeItemAmount = vi.fn();
    const addItem = vi.fn(() => true);
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
    expect(screen.queryByText(/Remaining/i)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Expense items' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Split into items'));
    fireEvent.click(screen.getByRole('button', { name: 'Add split item' }));
    expect(screen.queryByRole('dialog', { name: 'New split item' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Item name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Expected repayment')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ignore in analytics')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Tea' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm split item' }));
    expect(screen.queryByRole('button', { name: 'Assign remaining' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Split by parts' }));
    expect(screen.queryByRole('dialog', { name: 'Split by parts' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Amount to split')).toHaveValue(0);
    expect(screen.getByRole('button', { name: 'Confirm split by parts' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Amount to split'), { target: { value: '9.00' } });
    fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm split by parts' }));

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    expect(row).toHaveClass(splitStyles.item);
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Item actions for Coffee' }));
    const menu = screen.getByRole('menu', { name: 'Item actions for Coffee' });
    expect(row).not.toContainElement(menu);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit item Coffee' }));
    expect(screen.queryByRole('dialog', { name: 'Edit split item' })).not.toBeInTheDocument();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Item actions for Coffee' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove item Coffee' }));

    expect(toggleEnabled).toHaveBeenCalledTimes(1);
    expect(startItem).toHaveBeenCalledTimes(1);
    expect(changeItemName).toHaveBeenCalledWith('Tea');
    expect(changeItemAmount).toHaveBeenCalledWith('2.50');
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(splitByParts).toHaveBeenCalledWith('9.00', '3');
    expect(editItem).toHaveBeenCalledWith('item-1');
    expect(removeItem).toHaveBeenCalledWith('item-1');
  });

  it('cancels inline split item and split by parts without applying commands', () => {
    const addItem = vi.fn(() => true);
    const splitByParts = vi.fn();
    const cancelItem = vi.fn();

    render(
      <ExpenseSplitEditorView
        required={{
          config: {},
          data: { items: [] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            toggleEnabled: vi.fn(),
            changeItemName: vi.fn(),
            changeItemAmount: vi.fn(),
            addItem,
            splitByParts,
            editItem: vi.fn(),
            removeItem: vi.fn(),
            startItem: vi.fn(),
            cancelItem,
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add split item' }));
    expect(screen.getByLabelText('Item name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel split item' }));
    expect(screen.queryByLabelText('Item name')).not.toBeInTheDocument();
    expect(cancelItem).toHaveBeenCalledTimes(1);
    expect(addItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Split by parts' }));
    expect(screen.getByLabelText('Amount to split')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel split by parts' }));
    expect(screen.queryByLabelText('Amount to split')).not.toBeInTheDocument();
    expect(splitByParts).not.toHaveBeenCalled();
  });

  it('edits an existing split item inline', () => {
    const editItem = vi.fn();
    const addItem = vi.fn(() => true);
    const commands = {
      toggleEnabled: vi.fn(),
      changeItemName: vi.fn(),
      changeItemAmount: vi.fn(),
      addItem,
      splitByParts: vi.fn(),
      editItem,
      removeItem: vi.fn(),
      startItem: vi.fn(),
      cancelItem: vi.fn(),
    };

    const { rerender } = render(
      <ExpenseSplitEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-1', name: 'Coffee', amount: '4.00' }] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Item actions for Coffee' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit item Coffee' }));

    rerender(
      <ExpenseSplitEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-1', name: 'Coffee', amount: '4.00' }] },
          state: {
            enabled: true,
            itemName: 'Coffee',
            itemAmount: '4.00',
            editingItemId: 'item-1',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByLabelText('Item name')).toHaveValue('Coffee');
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '5.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm split item' }));

    expect(editItem).toHaveBeenCalledWith('item-1');
    expect(commands.changeItemAmount).toHaveBeenCalledWith('5.00');
    expect(addItem).toHaveBeenCalledTimes(1);
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
