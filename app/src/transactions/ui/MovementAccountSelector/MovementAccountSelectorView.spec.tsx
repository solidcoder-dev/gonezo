import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementAccountSelectorView } from './MovementAccountSelectorView';

describe('MovementAccountSelectorView', () => {
  it('renders accounts and marks the selected account', () => {
    const selectAccount = vi.fn();

    render(
      <MovementAccountSelectorView
        required={{
          data: {
            accounts: [
              { id: 'acc-1', name: 'billetera', currency: 'EUR', balanceLabel: '€1,074.52' },
              { id: 'acc-2', name: 'Cash', currency: 'EUR', balanceLabel: '€45.00' },
            ],
          },
          state: {
            open: true,
            selectedAccountId: 'acc-1',
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            close: vi.fn(),
            selectAccount,
          },
        }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Account for new movement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selected account billetera €1,074.52' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cash €45.00' }));
    expect(selectAccount).toHaveBeenCalledWith('acc-2');
  });

  it('does not render when closed', () => {
    render(
      <MovementAccountSelectorView
        required={{
          data: { accounts: [] },
          state: { open: false, selectedAccountId: '' },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            close: vi.fn(),
            selectAccount: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.queryByRole('dialog', { name: 'Account for new movement' })).not.toBeInTheDocument();
  });
});
