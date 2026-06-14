import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementQuickActionView } from './MovementQuickActionView';

describe('MovementQuickActionView', () => {
  it('maps movement copy and commands to the generic split action', () => {
    const createMovement = vi.fn();
    const toggleAccountSelector = vi.fn();

    render(
      <MovementQuickActionView
        required={{
          state: {
            accountName: 'billetera',
            selectorOpen: true,
          },
          status: { disabled: false },
        }}
        provided={{ commands: { createMovement, toggleAccountSelector } }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose account for new movement: billetera' }));

    expect(createMovement).toHaveBeenCalledTimes(1);
    expect(toggleAccountSelector).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Add movement' })).toBeInTheDocument();
    expect(screen.getByTestId('movement-quick-action-icon')).toHaveClass('bi-plus-circle');
    expect(screen.queryByText('Movement')).not.toBeInTheDocument();
    expect(screen.getByText('billetera')).toBeInTheDocument();
    expect(screen.getByTestId('split-floating-action-chevron')).toHaveClass('bi-chevron-up');
  });

  it('truncates long account names visually while keeping the full accessible label', () => {
    render(
      <MovementQuickActionView
        required={{
          state: {
            accountName: 'Main family wallet',
            selectorOpen: false,
          },
          status: { disabled: false },
        }}
        provided={{ commands: { createMovement: vi.fn(), toggleAccountSelector: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Choose account for new movement: Main family wallet' })).toBeInTheDocument();
    expect(screen.getByText('Main fam...')).toBeInTheDocument();
    expect(screen.queryByText('Main family wallet')).not.toBeInTheDocument();
  });
});
