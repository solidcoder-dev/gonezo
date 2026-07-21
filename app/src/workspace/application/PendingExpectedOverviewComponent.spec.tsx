import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PendingExpectedOverviewComponent } from './PendingExpectedOverviewComponent';

describe('PendingExpectedOverviewComponent', () => {
  it('uses one overview request and presents only two currencies per card', async () => {
    const core = {
      expectedGetPendingOverview: vi.fn(async () => ({
        expenses: {
          totalCount: 21,
          amountsByCurrency: [
            { currency: 'EUR', amount: '2804.67', movementCount: 18 },
            { currency: 'BRL', amount: '940.00', movementCount: 2 },
            { currency: 'USD', amount: '125.30', movementCount: 1 },
          ],
        },
        incomes: { totalCount: 0, amountsByCurrency: [] },
      })),
    };

    render(
      <PendingExpectedOverviewComponent
        required={{ context: { core }, config: { enabled: true, refreshSignal: false } }}
      />,
    );

    expect(await screen.findByRole('button', { name: /Pending expenses/i })).toBeInTheDocument();
    expect(screen.getByText('-€2,804.67')).toBeInTheDocument();
    expect(screen.getByText(/R\$940\.00 · 1 more currency/)).toBeInTheDocument();
    expect(core.expectedGetPendingOverview).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: /Pending incomes/i })).toBeDisabled());
  });

  it('emits the matching selection command for each card', async () => {
    const onExpenseSelected = vi.fn();
    const onIncomeSelected = vi.fn();
    const core = {
      expectedGetPendingOverview: vi.fn(async () => ({
        expenses: { totalCount: 1, amountsByCurrency: [{ currency: 'EUR', amount: '10.00', movementCount: 1 }] },
        incomes: { totalCount: 2, amountsByCurrency: [{ currency: 'EUR', amount: '20.00', movementCount: 2 }] },
      })),
    };

    render(
      <PendingExpectedOverviewComponent
        required={{ context: { core }, config: { enabled: true, refreshSignal: false } }}
        provided={{ events: { onExpenseSelected, onIncomeSelected } }}
      />,
    );

    const expenseButton = await screen.findByRole('button', { name: /Pending expenses/i });
    const incomeButton = await screen.findByRole('button', { name: /Pending incomes/i });
    fireEvent.click(expenseButton);
    fireEvent.click(incomeButton);

    expect(onExpenseSelected).toHaveBeenCalledTimes(1);
    expect(onIncomeSelected).toHaveBeenCalledTimes(1);
  });
});
