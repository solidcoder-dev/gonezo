import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyAccountsSheetComponent } from './CurrencyAccountsSheetComponent';

describe('CurrencyAccountsSheetComponent', () => {
  it('filters accounts by currency and includes archived balances', async () => {
    const core = {
      accountsListBalances: vi.fn(async () => ({ items: [
        { accountId: 'eur-active', name: 'Main EUR', type: 'cash', currency: 'eur', status: 'active', balanceAmount: '10.00', isDefault: true },
        { accountId: 'eur-archived', name: 'Old EUR', type: 'cash', currency: 'EUR', status: 'archived', balanceAmount: '20.00', isDefault: false },
        { accountId: 'usd', name: 'USD account', type: 'cash', currency: 'USD', status: 'active', balanceAmount: '30.00', isDefault: false },
      ] })),
    };

    render(
      <CurrencyAccountsSheetComponent
        required={{ context: { core: core as never }, config: { open: true, currency: 'EUR' } }}
        provided={{ events: { onClose: vi.fn() } }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Old EUR' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Main EUR' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /usd account/i })).not.toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('emits account selection and close commands', async () => {
    const onAccountSelected = vi.fn();
    const onManageAccountRequested = vi.fn();
    const onClose = vi.fn();
    const core = {
      accountsListBalances: vi.fn(async () => ({ items: [
        { accountId: 'eur', name: 'Main EUR', type: 'cash', currency: 'EUR', status: 'active', balanceAmount: '10.00', isDefault: false },
      ] })),
    };

    render(
      <CurrencyAccountsSheetComponent
        required={{ context: { core: core as never }, config: { open: true, currency: 'EUR' } }}
        provided={{ events: { onClose, onAccountSelected, onManageAccountRequested } }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Main EUR' })).toBeInTheDocument());
    screen.getByRole('button', { name: 'Main EUR' }).click();
    screen.getByRole('button', { name: 'Manage Main EUR' }).click();
    screen.getByRole('button', { name: 'Close EUR accounts' }).click();
    expect(onAccountSelected).toHaveBeenCalledWith('eur');
    expect(onManageAccountRequested).toHaveBeenCalledWith('eur');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
