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
              { accountId: 'acc-1', name: 'Main', formattedBalance: '$100.00', isDefault: true },
              { accountId: 'acc-2', name: 'Savings', formattedBalance: '$250.00', isDefault: false },
            ],
          },
          state: {},
          status: { loading: false },
        }}
        provided={{ commands: { createAccount, selectAccount, manageAccount } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Savings' }));

    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(manageAccount).toHaveBeenCalledWith('acc-1');
    expect(selectAccount).toHaveBeenCalledWith('acc-2');
  });
});
