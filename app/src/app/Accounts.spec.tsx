import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Accounts } from './Accounts';
import type { AccountsCorePort } from './accounts/useAccountsPageModel';
import type { TransactionItem } from '../domain/corePort';

function makeCore(transactionCount = 0): AccountsCorePort {
  const transactions: TransactionItem[] = Array.from({ length: transactionCount }).map((_, index) => ({
    id: `exp-${index + 1}`,
    postedDate: `2026-03-0${(index % 9) + 1}`,
    merchant: `Merchant ${index + 1}`,
    amount: `${index + 1}.00`,
    currency: 'USD',
    type: index % 2 === 0 ? 'expense' : 'income',
  }));

  return {
    listAccounts: vi.fn(async () => ({
      items: [
        {
          id: 'acc-1',
          name: 'Main',
          type: 'cash',
          currency: 'USD',
        },
      ],
    })),
    getAccountSummary: vi.fn(async () => ({
      accountId: 'acc-1',
      name: 'Main',
      type: 'cash',
      currency: 'USD',
      netAmount: '100.00',
    })),
    listTransactions: vi.fn(async () => ({ items: transactions })),
    createAccount: vi.fn(async () => ({ id: 'acc-1' })),
    postExpense: vi.fn(async () => ({ id: 'tx-exp' })),
    postIncome: vi.fn(async () => ({ id: 'tx-inc' })),
    updateTransaction: vi.fn(async ({ transactionId }) => ({ id: transactionId })),
    deleteTransaction: vi.fn(async () => undefined),
  };
}

describe('Accounts UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders custom amount control and no direct main amount input', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase amount by current step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease amount by current step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0.01' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0.10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit amount' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use last amount' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Amount value')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Current amount'));
    expect(screen.getByLabelText('Amount value')).toBeInTheDocument();
  });

  it('shows only 3 recent transactions and indicates hidden transactions', async () => {
    const core = makeCore(5);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    expect(await screen.findByText('+2 more transactions')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('submits expense by default and income when toggled', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Add transaction' });

    fireEvent.click(screen.getByRole('button', { name: 'Increase amount by current step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));

    await waitFor(() => {
      expect(core.postExpense).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Expense posted');

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase amount by current step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));

    await waitFor(() => {
      expect(core.postIncome).toHaveBeenCalledTimes(1);
    });
  });

  it('shows inline validation for empty amount', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Add transaction' });
    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));

    expect(await screen.findByText('Enter a valid amount greater than 0.')).toBeInTheDocument();
  });

  it('normalizes negative amount input to positive', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Add transaction' });
    fireEvent.click(screen.getByLabelText('Current amount'));
    fireEvent.change(screen.getByLabelText('Amount value'), { target: { value: '-3' } });
    fireEvent.blur(screen.getByLabelText('Amount value'));
    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));

    await waitFor(() => {
      expect(core.postExpense).toHaveBeenCalledTimes(1);
    });
    expect(core.postExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '3.00',
      })
    );
  });

  it('supports step settings, inline precise edit, and post again', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Add transaction' });
    fireEvent.click(screen.getByRole('radio', { name: 'Expense' }));

    fireEvent.click(screen.getByRole('button', { name: 'Toggle more steps' }));
    fireEvent.click(screen.getByRole('button', { name: '0.50' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase amount by current step' }));

    fireEvent.click(screen.getByLabelText('Current amount'));
    fireEvent.change(screen.getByLabelText('Amount value'), { target: { value: '12.3' } });
    fireEvent.blur(screen.getByLabelText('Amount value'));

    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));
    await waitFor(() => {
      expect(core.postExpense).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Post again' }));
    await waitFor(() => {
      expect(core.postExpense).toHaveBeenCalledTimes(2);
    });
  });

  it('allows editing and deleting a transaction', async () => {
    const core = makeCore(1);

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Recent transactions' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Current amount'));
    fireEvent.change(screen.getByLabelText('Amount value'), { target: { value: '9.99' } });
    fireEvent.blur(screen.getByLabelText('Amount value'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(core.updateTransaction).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(core.deleteTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
