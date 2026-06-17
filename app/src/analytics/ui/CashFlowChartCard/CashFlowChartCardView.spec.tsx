import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CashFlowChartCardView } from './CashFlowChartCardView';

describe('CashFlowChartCardView', () => {
  it('renders currency and granularity chips and dispatches selections', () => {
    const selectCurrency = vi.fn();
    const selectGranularity = vi.fn();

    render(
      <CashFlowChartCardView
        required={{
          data: {
            currencies: ['EUR', 'USD'],
            selectedCurrency: 'EUR',
            incomeTotalLabel: '€1,200.00',
            expenseTotalLabel: '€500.00',
            points: [
              {
                key: '2026-06',
                label: 'Jun',
                values: [
                  { key: 'expense', value: 500 },
                  { key: 'income', value: 1200 },
                ],
              },
            ],
          },
          state: { granularity: 'monthly' },
          status: { loading: false },
        }}
        provided={{ commands: { selectCurrency, selectGranularity } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Cash flow' })).toBeInTheDocument();
    expect(screen.getByText('€1,200.00')).toBeInTheDocument();
    expect(screen.getByText('€500.00')).toBeInTheDocument();

    fireEvent.click(within(screen.getByLabelText('Currencies')).getByRole('button', { name: 'USD' }));
    fireEvent.click(within(screen.getByLabelText('Cash flow duration')).getByRole('button', { name: 'Weekly' }));

    expect(selectCurrency).toHaveBeenCalledWith('USD');
    expect(selectGranularity).toHaveBeenCalledWith('weekly');
  });

  it('renders a chart skeleton while loading to keep the card height stable', () => {
    render(
      <CashFlowChartCardView
        required={{
          data: {
            currencies: ['EUR'],
            selectedCurrency: 'EUR',
            incomeTotalLabel: '€0.00',
            expenseTotalLabel: '€0.00',
            points: [],
          },
          state: { granularity: 'monthly' },
          status: { loading: true },
        }}
        provided={{ commands: { selectCurrency: vi.fn(), selectGranularity: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading cash flow chart' })).toBeInTheDocument();
    expect(screen.queryByText('Loading cash flow...')).not.toBeInTheDocument();
  });
});
