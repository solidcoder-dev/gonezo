import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Accounts } from './Accounts';
import type { AccountsCorePort } from './accounts/useAccountsPageModel';
import type { LedgerTransactionListItem } from '../domain/corePort';

function makeCore(transactionCount = 0): AccountsCorePort {
  const transactions: LedgerTransactionListItem[] = Array.from({ length: transactionCount }).map((_, index) => ({
    id: `tx-${index + 1}`,
    accountId: 'acc-1',
    occurredAt: `2026-03-0${(index % 9) + 1}`,
    description: `Description ${index + 1}`,
    merchant: `Merchant ${index + 1}`,
    amount: `${index + 1}.00`,
    currency: 'USD',
    type: index % 2 === 0 ? 'expense' : 'income',
    status: 'posted',
    items: [],
  }));

  return {
    ledgerListSupportedCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    ledgerListAccounts: vi.fn(async () => ({
      items: [
        {
          id: 'acc-1',
          name: 'Main',
          type: 'cash',
          currency: 'USD',
          status: 'active',
        },
        {
          id: 'acc-2',
          name: 'Savings',
          type: 'savings',
          currency: 'USD',
          status: 'active',
        },
      ],
    })),
    ledgerGetAccountSummary: vi.fn(async () => ({
      accountId: 'acc-1',
      name: 'Main',
      type: 'cash',
      currency: 'USD',
      balanceAmount: '100.00',
    })),
    ledgerListTransactions: vi.fn(async () => ({ items: transactions })),
    ledgerOpenAccount: vi.fn(async () => ({ id: 'acc-1' })),
    ledgerRecordExpense: vi.fn(async () => ({ id: 'tx-exp' })),
    ledgerRecordIncome: vi.fn(async () => ({ id: 'tx-inc' })),
    ledgerRecordTransfer: vi.fn(async () => ({ transferOutId: 'tx-tr-out', transferInId: 'tx-tr-in' })),
    ledgerCreateExpenseDraft: vi.fn(async () => ({ id: 'tx-draft' })),
    ledgerAddTransactionItem: vi.fn(async () => undefined),
    ledgerPostDraftTransaction: vi.fn(async () => undefined),
    ledgerVoidTransaction: vi.fn(async () => undefined),
  };
}

async function openMode(mode: 'Expense' | 'Income' | 'Transfer') {
  fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));
  fireEvent.click(await screen.findByRole('button', { name: mode }));
}

describe('Accounts UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses account list icon instead of horizontal tab row', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    expect(await screen.findByText('Current account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('records quick expense from dedicated expense flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Current account');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => {
      expect(core.ledgerRecordExpense).toHaveBeenCalledTimes(1);
    });
  });

  it('records income from dedicated income flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Current account');
    await openMode('Income');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save income' }));

    await waitFor(() => {
      expect(core.ledgerRecordIncome).toHaveBeenCalledTimes(1);
    });
  });

  it('records transfer from dedicated transfer flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Current account');
    await openMode('Transfer');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Destination account'), { target: { value: 'acc-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transfer' }));

    await waitFor(() => {
      expect(core.ledgerRecordTransfer).toHaveBeenCalledTimes(1);
    });
  });

  it('supports detailed expense with items using draft flow', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByText('Current account');
    await openMode('Expense');

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText('Item amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign remaining' }));

    fireEvent.click(screen.getByRole('button', { name: 'Publish expense' }));

    await waitFor(() => {
      expect(core.ledgerCreateExpenseDraft).toHaveBeenCalledTimes(1);
      expect(core.ledgerAddTransactionItem).toHaveBeenCalledTimes(2);
      expect(core.ledgerPostDraftTransaction).toHaveBeenCalledTimes(1);
    });
  });

  it('allows voiding a transaction', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    fireEvent.click(screen.getByRole('button', { name: 'Void' }));

    await waitFor(() => {
      expect(core.ledgerVoidTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
