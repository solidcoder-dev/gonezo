import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Accounts } from './Accounts';
import type { AccountsCorePort } from './accounts/useAccountsPageModel';

function makeCore(expenseCount = 0): AccountsCorePort {
  const expenses = Array.from({ length: expenseCount }).map((_, index) => ({
    id: `exp-${index + 1}`,
    postedDate: `2026-03-0${(index % 9) + 1}`,
    merchant: `Merchant ${index + 1}`,
    amount: `${index + 1}.00`,
    currency: 'USD',
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
    listExpenses: vi.fn(async () => ({ items: expenses })),
    createAccount: vi.fn(async () => ({ id: 'acc-1' })),
    postExpense: vi.fn(async () => ({ id: 'tx-exp' })),
    postIncome: vi.fn(async () => ({ id: 'tx-inc' })),
  };
}

describe('Accounts UX', () => {
  it('renders a single transaction composer and chip-based account switcher', async () => {
    const core = makeCore();

    render(
      <MemoryRouter>
        <Accounts core={core} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Add transaction' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add income' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add expense' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    const accountTab = screen.getByRole('tab', { name: 'Main (USD)' });
    expect(accountTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows only 3 recent expenses and indicates hidden transactions', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    fireEvent.click(screen.getByRole('button', { name: 'Post transaction' }));

    await waitFor(() => {
      expect(core.postExpense).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Expense posted');

    fireEvent.click(screen.getByRole('radio', { name: 'Income' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use last amount' }));
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
});
