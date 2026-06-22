import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountsRailView } from './AccountsRailView';

describe('AccountsRailView', () => {
  it('renders accounts horizontally and dispatches account actions', () => {
    const createAccount = vi.fn();
    const selectAccount = vi.fn();
    const manageAccount = vi.fn();

    render(
      <AccountsRailView
        required={{
          config: {},
          data: {
            accounts: [
              {
                accountId: 'acc-1',
                name: 'Main',
                type: 'cash',
                formattedBalance: '$100.00',
                trend: {
                  ariaLabel: 'Main balance trend',
                  points: [{ value: 50 }, { value: 75 }, { value: 100 }],
                },
                isDefault: true,
              },
              { accountId: 'acc-2', name: 'Savings', type: 'bank', formattedBalance: '$250.00', isDefault: false },
            ],
          },
          state: {},
          status: { loading: false },
        }}
        provided={{ commands: { createAccount, selectAccount, manageAccount } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getByTestId('account-icon-cash')).toBeInTheDocument();
    expect(screen.getByTestId('account-icon-bank')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Main balance trend')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Account settings for Savings' }));

    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(manageAccount).toHaveBeenCalledWith('acc-1');
    expect(manageAccount).toHaveBeenCalledWith('acc-2');
    expect(selectAccount).not.toHaveBeenCalled();
  });
});
