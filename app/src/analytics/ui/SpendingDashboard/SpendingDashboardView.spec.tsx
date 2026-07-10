import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingDashboardView } from './SpendingDashboardView';

describe('SpendingDashboardView', () => {
  it('renders category rows with values above a subtle spending bar', () => {
    render(
      <SpendingDashboardView
        required={{
          data: {
            totalAmount: '€840.00',
            comparisonAmount: '-24.00%',
            currentWindowLabel: 'Jun 1-Jun 30, 2026',
            previousWindowLabel: 'May 1-May 31, 2026',
            visibleCategories: [
              { key: 'bills', name: 'Bills', amount: '€601,000.00', percentage: 79, color: '#ffb7b2' },
              { key: 'dining', name: 'Dining', amount: '€100,050.00', percentage: 13, color: '#c6efd4' },
            ],
            allCategories: [
              { key: 'bills', name: 'Bills', amount: '€601,000.00', percentage: 79, color: '#ffb7b2' },
              { key: 'dining', name: 'Dining', amount: '€100,050.00', percentage: 13, color: '#c6efd4' },
            ],
          },
          state: {
            breakdownOpen: false,
          },
          status: {
            loading: false,
          },
        }}
        provided={{
          commands: {
            openBreakdown: vi.fn(),
            closeBreakdown: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByText('Compared to May 1-May 31, 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Where your money went' })).toBeInTheDocument();
    const billsRow = screen.getByLabelText('Bills spending share');
    const diningRow = screen.getByLabelText('Dining spending share');

    expect(within(billsRow).getByText('€601,000.00')).toBeInTheDocument();
    expect(within(billsRow).getByText('79%')).toBeInTheDocument();
    expect(within(diningRow).getByText('€100,050.00')).toBeInTheDocument();
    expect(within(diningRow).getByText('13%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See all categories' })).toBeInTheDocument();
  });

  it('opens the category breakdown sheet from the CTA', () => {
    const openBreakdown = vi.fn();

    render(
      <SpendingDashboardView
        required={{
          data: {
            totalAmount: '€840.00',
            comparisonAmount: '-24.00%',
            currentWindowLabel: 'Jun 1-Jun 30, 2026',
            previousWindowLabel: 'May 1-May 31, 2026',
            visibleCategories: [
              { key: 'bills', name: 'Bills', amount: '€601,000.00', percentage: 79, color: '#ffb7b2' },
            ],
            allCategories: [
              { key: 'bills', name: 'Bills', amount: '€601,000.00', percentage: 79, color: '#ffb7b2' },
            ],
          },
          state: {
            breakdownOpen: false,
          },
          status: {
            loading: false,
          },
        }}
        provided={{
          commands: {
            openBreakdown,
            closeBreakdown: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'See all categories' }));

    expect(openBreakdown).toHaveBeenCalledTimes(1);
  });
});
