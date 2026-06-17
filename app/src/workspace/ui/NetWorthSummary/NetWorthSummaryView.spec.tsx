import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetWorthSummaryView } from './NetWorthSummaryView';

describe('NetWorthSummaryView', () => {
  it('shows the first currencies horizontally and opens the full list', async () => {
    const openAll = vi.fn();
    const closeAll = vi.fn();

    const { rerender } = render(
      <NetWorthSummaryView
        required={{
          config: { visibleLimit: 3 },
          data: {
            items: [
              { currency: 'EUR', balanceAmount: '290.70', formattedBalance: '€290.70' },
              { currency: 'USD', balanceAmount: '50.10', formattedBalance: '$50.10' },
              { currency: 'GBP', balanceAmount: '25.00', formattedBalance: '£25.00' },
              { currency: 'BRL', balanceAmount: '15.00', formattedBalance: 'R$15.00' },
            ],
          },
          state: { allCurrenciesOpen: false },
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: { openAll, closeAll } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Total net worth' })).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.queryByText('BRL')).not.toBeInTheDocument();
    expect(screen.getByText('+1 currency')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View all net worth currencies' }));
    expect(openAll).toHaveBeenCalledTimes(1);

    rerender(
      <NetWorthSummaryView
        required={{
          config: { visibleLimit: 3 },
          data: {
            items: [
              { currency: 'EUR', balanceAmount: '290.70', formattedBalance: '€290.70' },
              { currency: 'USD', balanceAmount: '50.10', formattedBalance: '$50.10' },
              { currency: 'GBP', balanceAmount: '25.00', formattedBalance: '£25.00' },
              { currency: 'BRL', balanceAmount: '15.00', formattedBalance: 'R$15.00' },
            ],
          },
          state: { allCurrenciesOpen: true },
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: { openAll, closeAll } }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'All net worth currencies' })).toBeInTheDocument();
    expect(screen.getByText('BRL')).toBeInTheDocument();
  });
});
