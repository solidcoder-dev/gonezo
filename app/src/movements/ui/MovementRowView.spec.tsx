import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementRowView } from './MovementRowView';

describe('MovementRowView', () => {
  it('renders a compact movement row and dispatches selection', () => {
    const select = vi.fn();
    const { container } = render(
      <MovementRowView
        required={{
          config: {},
          data: {
            itemClassName: 'expense-item expense-item--expense',
            iconClassName: 'bi bi-arrow-down-right',
            title: 'Coffee',
            amount: { sign: '-', label: '$4.00', className: 'movement-amount movement-amount--expense' },
            details: ['Food', '#work'],
          },
          state: {},
          status: { disabled: false },
        }}
        provided={{ commands: { select } }}
      />,
    );

    expect(container.querySelector('li')).toHaveClass('expense-item--compact');
    expect(screen.getByRole('button', { name: /Coffee/i })).toBeInTheDocument();
    expect(screen.getByText('-$4.00')).toBeInTheDocument();
    expect(screen.getByText('-$4.00')).toHaveClass('movement-amount--expense');
    expect(screen.getByText('Food · #work')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Coffee/i }));
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('disables the row action from status', () => {
    render(
      <MovementRowView
        required={{
          config: {},
          data: {
            itemClassName: 'expense-item expense-item--income',
            iconClassName: 'bi bi-arrow-up-right',
            title: 'Salary',
            amount: { sign: '+', label: '$100.00' },
            details: [],
          },
          state: {},
          status: { disabled: true },
        }}
        provided={{ commands: { select: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('button', { name: /Salary/i })).toBeDisabled();
  });
});
