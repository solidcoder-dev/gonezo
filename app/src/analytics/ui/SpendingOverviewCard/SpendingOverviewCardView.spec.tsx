import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingOverviewCardView } from './SpendingOverviewCardView';

describe('SpendingOverviewCardView', () => {
  it('renders period menu and window navigation', () => {
    const selectGranularity = vi.fn();
    const goToPreviousWindow = vi.fn();
    const goToNextWindow = vi.fn();

    render(
      <SpendingOverviewCardView
        required={{
          data: {
            totalAmount: '€250.00',
            windowLabel: 'Jun 2026 - Jun 2026',
            categories: [
              { key: 'food', name: 'Food', amount: '€250.00', percentage: 100, color: '#86d69a' },
            ],
          },
          state: { granularity: 'monthly', canGoNextWindow: true },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectGranularity,
            goToPreviousWindow,
            goToNextWindow,
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Spending overview' })).toBeInTheDocument();
    expect(screen.getByText('Jun 2026 - Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select period' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Yearly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous spending overview window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next spending overview window' }));

    expect(selectGranularity).toHaveBeenCalledWith('yearly');
    expect(goToPreviousWindow).toHaveBeenCalledTimes(1);
    expect(goToNextWindow).toHaveBeenCalledTimes(1);
  });
});
