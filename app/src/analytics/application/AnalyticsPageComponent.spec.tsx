import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPageComponent } from './AnalyticsPageComponent';
import type { AnalyticsPort } from './analytics.port';

function createCore(): AnalyticsPort {
  return {
    analyticsListCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    analyticsGetCashFlowSeries: vi.fn(async (input) => ({
      currencies: ['EUR', 'USD'],
      selectedCurrency: input.currency,
      granularity: input.granularity,
      totals: { incomeAmount: '1000.00', expenseAmount: '250.00' },
      window: { label: 'Jan 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoNext: false },
      points: [
        { periodKey: '2026-06', label: 'Jun', incomeAmount: '1000.00', expenseAmount: '250.00' },
      ],
    })),
    analyticsGetPeriodCashFlowSummary: vi.fn(async (input) => ({
      incomeAmount: input.currency === 'USD' ? '300.00' : '1000.00',
      expenseAmount: input.currency === 'USD' ? '100.00' : '250.00',
      netFlowAmount: input.currency === 'USD' ? '200.00' : '750.00',
    })),
    analyticsGetSpendingOverview: vi.fn(async (input) => ({
      granularity: input.granularity,
      window: { label: 'Jun 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoNext: false },
      totalExpenseAmount: input.currency === 'USD' ? '100.00' : '250.00',
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food', amount: input.currency === 'USD' ? '100.00' : '250.00', percentage: 100 },
      ],
    })),
    analyticsSetMovementIgnored: vi.fn(),
    analyticsListIgnoredMovements: vi.fn(async () => ({ movementIds: [] })),
  };
}

describe('AnalyticsPageComponent', () => {
  it('uses a global currency selector while cards load through separate use cases', async () => {
    const core = createCore();

    render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    await waitFor(() => expect(core.analyticsGetPeriodCashFlowSummary).toHaveBeenCalledWith({ currency: 'EUR' }));
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 });
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 });

    fireEvent.change(screen.getByLabelText('Analytics currency'), { target: { value: 'USD' } });

    await waitFor(() => expect(core.analyticsGetPeriodCashFlowSummary).toHaveBeenCalledWith({ currency: 'USD' }));
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'USD', granularity: 'monthly', periodOffset: 0 });
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith({ currency: 'USD', granularity: 'monthly', periodOffset: 0 });
  }, 10000);
});
