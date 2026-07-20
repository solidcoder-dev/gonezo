import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManageAccountSheetComponent } from './ManageAccountSheetComponent';

function createCore(overrides: Record<string, unknown> = {}) {
  return {
    ledgerGetAccountSummary: vi.fn().mockResolvedValue({
      accountId: 'account-1',
      name: 'Checking',
      type: 'bank',
      currency: 'EUR',
      balanceAmount: '10.00',
    }),
    ledgerRenameAccount: vi.fn().mockResolvedValue(undefined),
    ledgerArchiveAccount: vi.fn().mockResolvedValue(undefined),
    ledgerDeleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ManageAccountSheetComponent', () => {
  it('renders nothing when closed or without an account', () => {
    const core = createCore();
    const { rerender } = render(
      <ManageAccountSheetComponent
        required={{ context: { core: core as never, accountId: null }, config: { open: false } }}
        provided={{ events: { onClose: vi.fn() } }}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <ManageAccountSheetComponent
        required={{ context: { core: core as never, accountId: null }, config: { open: true } }}
        provided={{ events: { onClose: vi.fn() } }}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads the selected account and exposes the existing management actions', async () => {
    const core = createCore();
    render(
      <ManageAccountSheetComponent
        required={{ context: { core: core as never, accountId: 'account-1' }, config: { open: true } }}
        provided={{ events: { onClose: vi.fn() } }}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Manage account' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Checking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    expect(core.ledgerGetAccountSummary).toHaveBeenCalledWith({ accountId: 'account-1' });
  });

  it('delegates rename once and emits the mutation event', async () => {
    const ledgerRenameAccount = vi.fn().mockResolvedValue(undefined);
    const onAccountMutated = vi.fn();
    const core = createCore({ ledgerRenameAccount });
    render(
      <ManageAccountSheetComponent
        required={{ context: { core: core as never, accountId: 'account-1' }, config: { open: true } }}
        provided={{ events: { onClose: vi.fn(), onAccountMutated } }}
      />,
    );

    await screen.findByRole('dialog', { name: 'Manage account' });
    const nameInput = screen.getByDisplayValue('Checking');
    nameInput.setAttribute('value', 'Renamed');
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    screen.getByRole('button', { name: 'Save name' }).click();

    await waitFor(() => expect(ledgerRenameAccount).toHaveBeenCalledTimes(1));
    expect(onAccountMutated).toHaveBeenCalledTimes(1);
  });

  it('delegates archive and delete once after confirmation', async () => {
    const archiveAccount = vi.fn().mockResolvedValue(undefined);
    const deleteAccount = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const core = createCore({ ledgerArchiveAccount: archiveAccount, ledgerDeleteAccount: deleteAccount });
    const onAccountMutated = vi.fn();
    const onAccountDeleted = vi.fn();
    render(
      <ManageAccountSheetComponent
        required={{ context: { core: core as never, accountId: 'account-1' }, config: { open: true } }}
        provided={{ events: { onClose: vi.fn(), onAccountMutated, onAccountDeleted } }}
      />,
    );

    await screen.findByRole('dialog', { name: 'Manage account' });
    screen.getByRole('button', { name: 'Archive account' }).click();
    await waitFor(() => expect(archiveAccount).toHaveBeenCalledTimes(1));
    screen.getByRole('button', { name: 'Delete account' }).click();
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onAccountMutated).toHaveBeenCalledTimes(1);
    expect(onAccountDeleted).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });
});
