import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementSplitManagerView } from './MovementSplitManagerView';

describe('MovementSplitManagerView', () => {
  it('renders compact item rows with toolbar actions and row actions', () => {
    const addSplit = vi.fn();
    const assignRemaining = vi.fn();
    const splitParts = vi.fn();
    const editSplit = vi.fn();
    const removeSplit = vi.fn();

    render(
      <MovementSplitManagerView
        required={{
          config: {},
          data: {
            items: [
              { id: 'item-1', name: 'Alex', amount: '18.40', expected: true },
              { id: 'item-2', name: 'Bruno', amount: '12.00', ignored: true },
            ],
          },
          state: {
            remaining: '18.40',
            currencyCode: 'USD',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            addSplit,
            assignRemaining,
            splitParts,
            editSplit,
            removeSplit,
          },
        }}
      />,
    );

    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Remaining: 18.40 USD')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Items' })).toBeInTheDocument();
    expect(screen.getByLabelText('Expected repayment')).toBeInTheDocument();
    expect(screen.getByLabelText('Ignored in analytics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));
    fireEvent.click(screen.getByRole('button', { name: 'Break down by parts' }));

    const alexRow = screen.getByText('Alex').closest('li');
    expect(alexRow).not.toBeNull();
    fireEvent.click(within(alexRow as HTMLElement).getByRole('button', { name: 'Item actions for Alex' }));
    fireEvent.click(within(alexRow as HTMLElement).getByRole('menuitem', { name: 'Edit item Alex' }));
    fireEvent.click(within(alexRow as HTMLElement).getByRole('menuitem', { name: 'Remove item Alex' }));

    expect(addSplit).toHaveBeenCalledTimes(1);
    expect(assignRemaining).toHaveBeenCalledTimes(1);
    expect(splitParts).toHaveBeenCalledTimes(1);
    expect(editSplit).toHaveBeenCalledWith('item-1');
    expect(removeSplit).toHaveBeenCalledWith('item-1');
  });

  it('renders an empty item manager when creation is available', () => {
    render(
      <MovementSplitManagerView
        required={{
          config: {},
          data: { items: [] },
          state: {},
          status: {},
        }}
        provided={{ commands: { addSplit: vi.fn() } }}
      />,
    );

    expect(screen.getByText('No items yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Items' })).not.toBeInTheDocument();
  });

  it('does not render when there are no items or available item actions', () => {
    const { container } = render(
      <MovementSplitManagerView
        required={{
          config: {},
          data: { items: [] },
          state: {},
          status: {},
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('disables toolbar and row actions when the sheet is disabled', () => {
    render(
      <MovementSplitManagerView
        required={{
          config: {},
          data: { items: [{ id: 'item-1', name: 'Alex', amount: '18.40' }] },
          state: {},
          status: { disabled: true },
        }}
        provided={{
          commands: {
            addSplit: vi.fn(),
            editSplit: vi.fn(),
            removeSplit: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Item actions for Alex' }));
    expect(screen.getByRole('menuitem', { name: 'Edit item Alex' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Remove item Alex' })).toBeDisabled();
  });
});
