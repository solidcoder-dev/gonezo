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
            windowLabel: 'Jun 2026',
            categories: [
              { key: 'food', name: 'Food', amount: '€250.00', percentage: 100, color: '#86d69a' },
            ],
          },
          state: { granularity: 'monthly', canGoNextWindow: true, categoryBreakdownOpen: false },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectGranularity,
            goToPreviousWindow,
            goToNextWindow,
            openCategoryBreakdown: vi.fn(),
            closeCategoryBreakdown: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Spending overview' })).toBeInTheDocument();
    expect(screen.getByText('Jun 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select period' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Yearly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous spending overview window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next spending overview window' }));

    expect(selectGranularity).toHaveBeenCalledWith('yearly');
    expect(goToPreviousWindow).toHaveBeenCalledTimes(1);
    expect(goToNextWindow).toHaveBeenCalledTimes(1);
  });

  it('opens the category breakdown through a bottom sheet command', () => {
    const openCategoryBreakdown = vi.fn();

    render(
      <SpendingOverviewCardView
        required={{
          data: {
            totalAmount: '€250.00',
            windowLabel: 'Jun 2026',
            categories: [
              { key: 'food', name: 'Food', amount: '€250.00', percentage: 100, color: '#86d69a' },
            ],
          },
          state: { granularity: 'monthly', canGoNextWindow: false, categoryBreakdownOpen: false },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectGranularity: vi.fn(),
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
            openCategoryBreakdown,
            closeCategoryBreakdown: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.queryByRole('dialog', { name: 'Spending categories' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View categories' }));

    expect(openCategoryBreakdown).toHaveBeenCalledTimes(1);
  });

  it('renders category rows inside the bottom sheet when it is open', () => {
    const closeCategoryBreakdown = vi.fn();

    render(
      <SpendingOverviewCardView
        required={{
          data: {
            totalAmount: '€250.00',
            windowLabel: 'Jun 2026',
            categories: [
              { key: 'food', name: 'Food', amount: '€250.00', percentage: 100, color: '#86d69a' },
            ],
          },
          state: { granularity: 'monthly', canGoNextWindow: false, categoryBreakdownOpen: true },
          status: { loading: false },
        }}
        provided={{
          commands: {
            selectGranularity: vi.fn(),
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
            openCategoryBreakdown: vi.fn(),
            closeCategoryBreakdown,
          },
        }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Spending categories' })).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close spending categories' }));

    expect(closeCategoryBreakdown).toHaveBeenCalledTimes(1);
  });


  it('renders a shaped skeleton while loading', () => {
    render(
      <SpendingOverviewCardView
        required={{
          data: { totalAmount: '€0.00', windowLabel: 'Jun 2026', categories: [] },
          state: { granularity: 'monthly', canGoNextWindow: false, categoryBreakdownOpen: false },
          status: { loading: true },
        }}
        provided={{
          commands: {
            selectGranularity: vi.fn(),
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
            openCategoryBreakdown: vi.fn(),
            closeCategoryBreakdown: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading spending overview' })).toBeInTheDocument();
    expect(screen.queryByText('Loading spending...')).not.toBeInTheDocument();
  });
});
