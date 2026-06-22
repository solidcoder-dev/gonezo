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
            windowLabel: 'Jan 2026 - Jun 2026',
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
          state: { granularity: 'monthly', canGoNextWindow: false },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectCurrency,
            selectGranularity,
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Cash flow' })).toBeInTheDocument();
    expect(screen.queryByText('€1,200.00')).not.toBeInTheDocument();
    expect(screen.queryByText('€500.00')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByLabelText('Currencies')).getByRole('button', { name: 'USD' }));
    fireEvent.click(within(screen.getByLabelText('Cash flow duration')).getByRole('button', { name: 'Weekly' }));

    expect(selectCurrency).toHaveBeenCalledWith('USD');
    expect(selectGranularity).toHaveBeenCalledWith('weekly');
  });

  it('renders window navigation and hides the currency selector when there is only one currency', () => {
    const goToPreviousWindow = vi.fn();
    const goToNextWindow = vi.fn();

    render(
      <CashFlowChartCardView
        required={{
          data: {
            currencies: ['EUR'],
            selectedCurrency: 'EUR',
            windowLabel: 'Jan 2026 - Jun 2026',
            points: [],
          },
          state: { granularity: 'monthly', canGoNextWindow: true },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectCurrency: vi.fn(),
            selectGranularity: vi.fn(),
            goToPreviousWindow,
            goToNextWindow,
          },
        }}
      />,
    );

    expect(screen.queryByLabelText('Currencies')).not.toBeInTheDocument();
    expect(screen.getByText('Jan 2026 - Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous cash flow window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next cash flow window' }));

    expect(goToPreviousWindow).toHaveBeenCalledTimes(1);
    expect(goToNextWindow).toHaveBeenCalledTimes(1);
  });

  it('renders chart values as period values instead of accumulated totals', () => {
    render(
      <CashFlowChartCardView
        required={{
          data: {
            currencies: ['EUR'],
            selectedCurrency: 'EUR',
            windowLabel: '2018 - 2022',
            points: [
              {
                key: '2018',
                label: '2018',
                values: [
                  { key: 'expense', value: 0 },
                  { key: 'income', value: 100 },
                ],
              },
              {
                key: '2019',
                label: '2019',
                values: [
                  { key: 'expense', value: 20 },
                  { key: 'income', value: 50 },
                ],
              },
            ],
          },
          state: { granularity: 'yearly', canGoNextWindow: true },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectCurrency: vi.fn(),
            selectGranularity: vi.fn(),
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByText('Expense 0; Income 100')).toBeInTheDocument();
    expect(screen.getByText('Expense 20; Income 50')).toBeInTheDocument();
    expect(screen.queryByText('Expense 20; Income 150')).not.toBeInTheDocument();
  });

  it('renders a chart skeleton while loading to keep the card height stable', () => {
    render(
      <CashFlowChartCardView
        required={{
          data: {
            currencies: ['EUR'],
            selectedCurrency: 'EUR',
            windowLabel: 'Jan 2026 - Jun 2026',
            points: [],
          },
          state: { granularity: 'monthly', canGoNextWindow: false },
          status: { loading: true },
        }}
        provided={{
          commands: {
            selectCurrency: vi.fn(),
            selectGranularity: vi.fn(),
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading cash flow chart' })).toBeInTheDocument();
    expect(screen.queryByText('Loading cash flow...')).not.toBeInTheDocument();
  });
});
