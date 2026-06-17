import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CashFlowChartCardComponent, type CashFlowChartCardPort } from './CashFlowChartCardComponent';

function createCore(): CashFlowChartCardPort {
  return {
    ledgerGetCashFlowSeries: vi.fn(async (input) => ({
      currencies: ['EUR', 'USD'],
      selectedCurrency: input.currency ?? 'EUR',
      granularity: input.granularity,
      totals: {
        incomeAmount: input.currency === 'USD' ? '300.00' : '1200.00',
        expenseAmount: input.currency === 'USD' ? '100.00' : '500.00',
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
  it('loads cash flow and reloads when currency or granularity changes', async () => {
    const core = createCore();

    render(
      <CashFlowChartCardComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByText(/1,200.00/)).toBeInTheDocument();
    expect(core.ledgerGetCashFlowSeries).toHaveBeenCalledWith({ currency: undefined, granularity: 'monthly' });

    fireEvent.click(within(screen.getByLabelText('Currencies')).getByRole('button', { name: 'USD' }));
    await waitFor(() => expect(core.ledgerGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'USD', granularity: 'monthly' }));
    expect(await screen.findByText(/\$300.00/)).toBeInTheDocument();

    fireEvent.click(within(screen.getByLabelText('Cash flow duration')).getByRole('button', { name: 'Weekly' }));
    await waitFor(() => expect(core.ledgerGetCashFlowSeries).toHaveBeenCalledWith({ currency: 'USD', granularity: 'weekly' }));
  });
});
