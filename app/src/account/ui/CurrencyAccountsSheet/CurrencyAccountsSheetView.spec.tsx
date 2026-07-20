import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyAccountsSheetView } from './CurrencyAccountsSheetView';

function renderSubject(loadPhase: 'loading' | 'empty' | 'success' | 'error') {
  render(
    <CurrencyAccountsSheetView
      required={{
        config: {},
        data: { currency: 'EUR', accounts: [] },
        state: {},
        status: { loadPhase, error: loadPhase === 'error' ? 'Network error' : undefined },
      }}
      provided={{ commands: { close: vi.fn(), selectAccount: vi.fn(), manageAccount: vi.fn() } }}
    />,
  );
}

describe('CurrencyAccountsSheetView', () => {
  it.each([
    ['loading', 'Loading accounts...'],
    ['empty', 'No accounts in EUR.'],
    ['error', 'Network error'],
  ] as const)('renders the %s state', (loadPhase, message) => {
    renderSubject(loadPhase);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders a success row as a single accessible action', () => {
    const selectAccount = vi.fn();
    render(
      <CurrencyAccountsSheetView
        required={{
          config: {},
          data: {
            currency: 'EUR',
            accounts: [{ accountId: 'eur', name: 'Main EUR', formattedBalance: '€10.00', currency: 'EUR', status: 'active', isDefault: false, type: 'bank' }],
          },
          state: {},
          status: { loadPhase: 'success' },
        }}
        provided={{ commands: { close: vi.fn(), selectAccount, manageAccount: vi.fn() } }}
      />,
    );

    screen.getByRole('button', { name: 'Main EUR' }).click();
    expect(selectAccount).toHaveBeenCalledWith('eur');
  });

  it('renders one grouped surface with a selectable row and a separate manage control', () => {
    const selectAccount = vi.fn();
    const manageAccount = vi.fn();
    render(
      <CurrencyAccountsSheetView
        required={{
          config: {},
          data: {
            currency: 'EUR',
            accounts: [
              { accountId: 'active', name: 'Main EUR', formattedBalance: '€10.00', currency: 'EUR', status: 'active', isDefault: true, type: 'bank' },
              { accountId: 'archived', name: 'Old EUR', formattedBalance: '€20.00', currency: 'EUR', status: 'archived', isDefault: false, type: 'cash' },
            ],
          },
          state: {},
          status: { loadPhase: 'success' },
        }}
        provided={{ commands: { close: vi.fn(), selectAccount, manageAccount } }}
      />,
    );

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Manage Main EUR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Old EUR' })).toBeEnabled();
    screen.getByRole('button', { name: 'Manage Old EUR' }).click();
    expect(manageAccount).toHaveBeenCalledWith('archived');
    expect(screen.getByRole('button', { name: 'Main EUR' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Old EUR' })).toBeDisabled();
  });
});
