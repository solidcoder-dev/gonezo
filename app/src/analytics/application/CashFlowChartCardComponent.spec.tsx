import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CashFlowChartCardComponent, type CashFlowChartCardPort } from './CashFlowChartCardComponent';

function createCore(): CashFlowChartCardPort {
  return {
    analyticsGetCashFlowSeries: vi.fn(async (input) => ({
      currencies: ['EUR', 'USD'],
      selectedCurrency: input.currency ?? 'EUR',
      granularity: input.granularity,
      totals: {
        incomeAmount: input.currency === 'USD' ? '300.00' : '1200.00',
        expenseAmount: input.currency === 'USD' ? '100.00' : '500.00',
      },
      window: {
        label: input.periodOffset === -1 ? 'Dec 2025 - May 2026' : 'Jan 2026 - Jun 2026',
        periodOffset: input.periodOffset ?? 0,
        canGoNext: (input.periodOffset ?? 0) < 0,
      },
      points: [
        {
          periodKey: '2026-06',
          label: 'Jun',
          incomeAmount: input.currency === 'USD' ? '300.00' : '1200.00',
          expenseAmount: input.currency === 'USD' ? '100.00' : '500.00',
        },
      ],
    })),
  };
}

describe('CashFlowChartCardComponent', () => {
  it('loads cash flow and reloads when global currency or granularity changes', async () => {
    const core = createCore();

    const { rerender } = render(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Expense 500; Income 1200')).toBeInTheDocument();
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 });
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledTimes(1);

    rerender(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'USD', refreshSignal: false },
        }}
      />,
    );
    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'USD', granularity: 'monthly', periodOffset: 0 }));
    expect(await screen.findByText('Expense 100; Income 300')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select period' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Weekly' }));
    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'USD', granularity: 'weekly', periodOffset: 0 }));
  });

  it('navigates cash flow windows', async () => {
    const core = createCore();

    render(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Jan 2026 - Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous cash flow window' }));

    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: -1,
    }));
    expect(await screen.findByText('Dec 2025 - May 2026')).toBeInTheDocument();
  });

  it('resets the window when global currency changes', async () => {
    const core = createCore();

    const { rerender } = render(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText('Jan 2026 - Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous cash flow window' }));
    await screen.findByText('Dec 2025 - May 2026');

    rerender(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'USD', refreshSignal: false },
        }}
      />,
    );

    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith({
      currency: 'USD',
      granularity: 'monthly',
      periodOffset: 0,
    }));
  });
});
