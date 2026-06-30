import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemBreakdownEditorView } from './ItemBreakdownEditorView';
import type { ItemBreakdownEditorViewProps } from './ItemBreakdownEditorView';

function makeCommands(overrides: Partial<ItemBreakdownEditorViewProps['provided']['commands']> = {}) {
  return {
    toggleEnabled: vi.fn(),
    changeItemName: vi.fn(),
    changeItemAmount: vi.fn(),
    addItem: vi.fn(() => true),
    splitByParts: vi.fn(),
    splitByWeightedParts: vi.fn(),
    editItem: vi.fn(),
    removeItem: vi.fn(),
    startItem: vi.fn(),
    cancelItem: vi.fn(),
    selectMode: vi.fn(),
    ...overrides,
  };
}

describe('ItemBreakdownEditorView', () => {
  it('renders item rows and dispatches item commands', () => {
    const commands = makeCommands();

    render(
      <ItemBreakdownEditorView
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
            splitMode: 'items',
            splitTotal: '4.00',
            splitBaseAmount: '10.00',
            splitRemaining: '6.00',
            currencyCode: 'USD',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.queryByRole('tab', { name: 'Sharing' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remaining auto 6.00 USD')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Expense items' })).getByText('4.00 USD')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Tea' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '2.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(commands.changeItemName).toHaveBeenCalledWith('Tea');
    expect(commands.changeItemAmount).toHaveBeenCalledWith('2.50');
    expect(commands.addItem).toHaveBeenCalledTimes(1);

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLElement);
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Remove item Coffee' }));
    expect(commands.editItem).toHaveBeenCalledWith('item-1');
    expect(commands.removeItem).toHaveBeenCalledWith('item-1');
  });

  it('renders empty, remaining and over-base item breakdown states', () => {
    const commands = makeCommands();
    const { rerender } = render(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
            splitMode: 'items',
            splitTotal: '0.00',
            splitBaseAmount: '20.00',
            splitRemaining: '20.00',
            currencyCode: 'EUR',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Remaining auto/i)).not.toBeInTheDocument();

    rerender(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-food', name: 'Food', amount: '7.00' }] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
            splitMode: 'items',
            splitTotal: '7.00',
            splitBaseAmount: '20.00',
            splitRemaining: '13.00',
            currencyCode: 'EUR',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByLabelText('Remaining auto 13.00 EUR')).toBeInTheDocument();

    rerender(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-food', name: 'Food', amount: '22.00' }] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
            splitMode: 'items',
            splitTotal: '22.00',
            splitBaseAmount: '20.00',
            splitRemaining: '-2.00',
            currencyCode: 'EUR',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Movement amount: 20.00 EUR. Items total: 22.00 EUR.');
  });

  it('edits an existing item inline', () => {
    const editItem = vi.fn();
    const addItem = vi.fn(() => true);
    const commands = makeCommands({ editItem, addItem });
    const { rerender } = render(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-1', name: 'Coffee', amount: '4.00' }] },
          state: {
            enabled: true,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
            splitMode: 'items',
            splitTotal: '4.00',
            splitBaseAmount: '10.00',
            splitRemaining: '6.00',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    const row = screen.getByText('Coffee').closest('li');
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLElement);

    rerender(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [{ id: 'item-1', name: 'Coffee', amount: '4.00' }] },
          state: {
            enabled: true,
            itemName: 'Coffee',
            itemAmount: '4.00',
            editingItemId: 'item-1',
            splitMode: 'items',
            splitTotal: '4.00',
            splitBaseAmount: '10.00',
            splitRemaining: '6.00',
          },
          status: { disabled: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByLabelText('Description')).toHaveValue('Coffee');
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '5.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    expect(editItem).toHaveBeenCalledWith('item-1');
    expect(commands.changeItemAmount).toHaveBeenCalledWith('5.00');
    expect(addItem).toHaveBeenCalledTimes(1);
  });

  it('renders validation feedback and hides editor body when disabled by state', () => {
    render(
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: [] },
          state: {
            enabled: false,
            itemName: '',
            itemAmount: '',
            editingItemId: '',
            splitMode: 'items',
            splitTotal: '',
            splitBaseAmount: '0.00',
            splitRemaining: '0.00',
            itemNameError: 'Item name is required',
            splitError: 'Items must match amount',
          },
          status: { disabled: true },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByLabelText('Add items')).toBeDisabled();
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Item name is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Items must match amount')).not.toBeInTheDocument();
  });
});
