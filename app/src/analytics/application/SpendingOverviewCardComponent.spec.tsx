import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingOverviewCardComponent, type SpendingOverviewCardPort } from './SpendingOverviewCardComponent';

function createCore(): SpendingOverviewCardPort {
  return {
    analyticsGetSpendingOverview: vi.fn(async (input) => ({
      granularity: input.granularity,
      window: {
        label: input.periodOffset === -1 ? 'May 2026' : 'Jun 2026',
        periodOffset: input.periodOffset ?? 0,
        canGoNext: (input.periodOffset ?? 0) < 0,
      },
      totalExpenseAmount: input.granularity === 'yearly' ? '1200.00' : '250.00',
      categories: [
        {
          categoryId: 'cat-food',
          categoryName: 'Food',
          amount: input.granularity === 'yearly' ? '1200.00' : '250.00',
          percentage: 100,
        },
      ],
    })),
  };
}

describe('SpendingOverviewCardComponent', () => {
  it('loads monthly spending by default and reloads period changes independently', async () => {
    const core = createCore();

    render(
      <SpendingOverviewCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Jun 2026')).toBeInTheDocument();
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 }));

    fireEvent.click(screen.getByRole('button', { name: 'Select period' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Yearly' }));

    await waitFor(() => expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR',
      granularity: 'yearly',
      periodOffset: 0,
    })));
  });

  it('navigates spending overview windows', async () => {
    const core = createCore();

    render(
      <SpendingOverviewCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous spending overview window' }));

    await waitFor(() => expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: -1,
    })));
    expect(await screen.findByText('May 2026')).toBeInTheDocument();
  });
});
