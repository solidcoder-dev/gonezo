import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementDetailSheetView } from './MovementDetailSheetView';

describe('MovementDetailSheetView', () => {
  it('renders movement details, meta, splits and actions', () => {
    const close = vi.fn();
    const voidMovement = vi.fn();
    render(
      <MovementDetailSheetView
        required={{
          config: {
            ariaLabel: 'Movement details',
            closeLabel: 'Close movement details',
          },
          data: {
            title: 'Coffee',
            kicker: 'Expense · Posted',
            iconClassName: 'bi bi-arrow-down-right',
            amount: {
              kind: 'expense',
              sign: '-',
              value: '12.50',
              currency: 'USD',
            },
            meta: [
              { label: 'Date', value: 'Today' },
              { label: 'Category', value: 'Food' },
            ],
            splitItems: [
              { id: 'item-1', name: 'Espresso', amount: '4.50' },
              { id: 'item-2', name: 'Sandwich', amount: '8.00' },
            ],
            actions: [
              { key: 'void', label: 'Void movement', variant: 'danger', onClick: voidMovement },
            ],
          },
          state: { open: true },
          status: { disabled: false },
        }}
        provided={{ commands: { close } }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Movement details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coffee' })).toBeInTheDocument();
    expect(screen.getByText('Expense · Posted')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Espresso')).toBeInTheDocument();
    expect(screen.getByText('8.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Void movement' }));
    expect(voidMovement).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close movement details' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shows the ignored chip only for ignored movements', () => {
    const data = {
      title: 'Coffee',
      kicker: 'Expense · Posted',
      iconClassName: 'bi bi-arrow-down-right',
      amount: {
        kind: 'expense' as const,
        sign: '-',
        value: '12.50',
        currency: 'USD',
      },
      meta: [],
    };
    const { rerender } = render(
      <MovementDetailSheetView
        required={{
          config: { ariaLabel: 'Movement details' },
          data,
          state: { open: true },
          status: { disabled: false },
        }}
        provided={{ commands: { close: vi.fn() } }}
      />,
    );

    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();

    rerender(
      <MovementDetailSheetView
        required={{
          config: { ariaLabel: 'Movement details' },
          data: { ...data, ignored: true },
          state: { open: true },
          status: { disabled: false },
        }}
        provided={{ commands: { close: vi.fn() } }}
      />,
    );

    expect(screen.getByText('Ignored')).toBeInTheDocument();
  });
});
