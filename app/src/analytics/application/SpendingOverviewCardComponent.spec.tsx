import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingOverviewCardComponent, type SpendingOverviewCardPort } from './SpendingOverviewCardComponent';

function createCore(): SpendingOverviewCardPort {
  return {
    analyticsGetSpendingOverview: vi.fn(async (input) => ({
      granularity: input.granularity,
      window: {
        label: input.periodOffset === -1 ? 'May 2026' : 'Jun 2026',
        periodOffset: input.periodOffset ?? 0,
        canGoPrevious: true,
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
  it('loads monthly spending into top category bars', async () => {
    const core = createCore();

    render(
      <SpendingOverviewCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText((_, element) => element?.textContent === '€250.00 in Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('€250.00')).toBeInTheDocument();
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 }));
  });
});
