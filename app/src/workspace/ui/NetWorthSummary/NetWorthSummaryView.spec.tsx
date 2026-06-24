import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetWorthSummaryView } from './NetWorthSummaryView';

describe('NetWorthSummaryView', () => {
  it('shows secondary currencies horizontally without a full list action', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: {
            items: [
              { currency: 'EUR', balanceAmount: '290.70', formattedBalance: '€290.70' },
              { currency: 'USD', balanceAmount: '50.10', formattedBalance: '$50.10' },
              { currency: 'GBP', balanceAmount: '25.00', formattedBalance: '£25.00' },
              { currency: 'BRL', balanceAmount: '15.00', formattedBalance: 'R$15.00' },
            ],
          },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Balances by currency' })).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.getByText('BRL')).toBeInTheDocument();
    expect(screen.queryByText('+1 currency')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /net worth currencies/i })).not.toBeInTheDocument();
  });

  it('renders optional net worth trends per currency without requiring backend data today', () => {
    render(
      <NetWorthSummaryView
        required={{
          config: {},
          data: {
            items: [
              {
                currency: 'EUR',
                balanceAmount: '21560.66',
                formattedBalance: '€21,560.66',
                trend: {
                  points: [
                    { value: 18000 },
                    { value: 19000 },
                    { value: 18500 },
                    { value: 21560.66 },
                  ],
                  ariaLabel: 'EUR net worth trend',
                },
              },
              {
                currency: 'USD',
                balanceAmount: '1200.00',
                formattedBalance: '$1,200.00',
                trend: {
                  points: [
                    { value: 900 },
                    { value: 1100 },
                    { value: 1050 },
                    { value: 1200 },
                  ],
                  ariaLabel: 'USD net worth trend',
                },
              },
              {
                currency: 'GBP',
                balanceAmount: '800.00',
                formattedBalance: '£800.00',
              },
            ],
          },
          state: {},
          status: { loadPhase: 'succeeded' },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByLabelText('EUR net worth trend')).toBeInTheDocument();
    expect(screen.getByLabelText('USD net worth trend')).toBeInTheDocument();
    expect(screen.queryByLabelText('GBP net worth trend')).not.toBeInTheDocument();
  });
});
