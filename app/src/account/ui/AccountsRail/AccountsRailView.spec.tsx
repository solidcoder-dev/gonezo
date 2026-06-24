import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountsRailView } from './AccountsRailView';

describe('AccountsRailView', () => {
  it('renders account preview and opens all accounts sheet', () => {
    const openAllAccounts = vi.fn();
    const closeAllAccounts = vi.fn();
    const selectAccount = vi.fn();
    const manageAccount = vi.fn();

    const { rerender } = render(
      <AccountsRailView
        required={{
          config: { previewLimit: 3 },
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
              { accountId: 'acc-3', name: 'Wise', type: 'cash', formattedBalance: '€80.00', isDefault: false },
              { accountId: 'acc-4', name: 'Broker', type: 'bank', formattedBalance: '£50.00', isDefault: false },
            ],
          },
          state: { allAccountsOpen: false },
          status: { loading: false },
        }}
        provided={{ commands: { openAllAccounts, closeAllAccounts, selectAccount, manageAccount } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.getAllByTestId('account-icon-cash')).toHaveLength(2);
    expect(screen.getByTestId('account-icon-bank')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('€80.00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Broker' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Main balance trend')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'See all accounts' }));
    expect(openAllAccounts).toHaveBeenCalledTimes(1);

    rerender(
      <AccountsRailView
        required={{
          config: { previewLimit: 3 },
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
              { accountId: 'acc-3', name: 'Wise', type: 'cash', formattedBalance: '€80.00', isDefault: false },
              { accountId: 'acc-4', name: 'Broker', type: 'bank', formattedBalance: '£50.00', isDefault: false },
            ],
          },
          state: { allAccountsOpen: true },
          status: { loading: false },
        }}
        provided={{ commands: { openAllAccounts, closeAllAccounts, selectAccount, manageAccount } }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'All accounts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Broker' }));
    expect(closeAllAccounts).toHaveBeenCalledTimes(1);

    const previewList = screen.getByLabelText('Accounts list');
    fireEvent.click(within(previewList).getByRole('button', { name: 'Main' }));
    fireEvent.click(within(previewList).getByRole('button', { name: 'Savings' }));

    expect(selectAccount).toHaveBeenCalledWith('acc-4');
    expect(selectAccount).toHaveBeenCalledWith('acc-1');
    expect(selectAccount).toHaveBeenCalledWith('acc-2');
    expect(manageAccount).toHaveBeenCalledWith('acc-4');
    expect(manageAccount).toHaveBeenCalledWith('acc-1');
    expect(manageAccount).toHaveBeenCalledWith('acc-2');
  });
});
