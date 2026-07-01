import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingOverviewCardView } from './SpendingOverviewCardView';

describe('SpendingOverviewCardView', () => {
  it('renders top spending category bars', () => {

    render(
      <SpendingOverviewCardView
        required={{
          data: {
            totalAmount: '€250.00',
            windowLabel: 'Jun 2026',
            categories: [
              { key: 'food', name: 'Dining', amount: '€120.00', percentage: 48, color: '#f7cf6d' },
              { key: 'travel', name: 'Travel', amount: '€80.00', percentage: 32, color: '#8ab9ee' },
            ],
          },
          state: { granularity: 'monthly', canGoNextWindow: true, categoryBreakdownOpen: false },
          status: { loading: false },
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

    expect(screen.getByRole('heading', { name: 'Top spending categories' })).toBeInTheDocument();
    expect(screen.getByText('€250.00 in Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('€120.00')).toBeInTheDocument();
    expect(screen.getByText('48%')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Open spending categories' }));
    fireEvent.click(screen.getByRole('button', { name: 'See all categories' }));

    expect(openCategoryBreakdown).toHaveBeenCalledTimes(2);
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

    const dialog = screen.getByRole('dialog', { name: 'Spending categories' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Food')).toBeInTheDocument();
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
