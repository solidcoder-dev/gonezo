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
    fireEvent.click(screen.getByRole('button', { name: 'Choose account for new movement' }));

    expect(createMovement).toHaveBeenCalledTimes(1);
    expect(toggleAccountSelector).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+ Movement')).toBeInTheDocument();
    expect(screen.getByText('billetera')).toBeInTheDocument();
    expect(screen.getByTestId('split-floating-action-chevron')).toHaveClass('bi-chevron-up');
  });
});
