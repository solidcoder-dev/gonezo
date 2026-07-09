import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewSnapshotCardView } from './OverviewSnapshotCardView';
import styles from './OverviewSnapshotCardView.module.css';

describe('OverviewSnapshotCardView', () => {
  it('renders the overview totals and biggest movement highlights', () => {
    render(
      <OverviewSnapshotCardView
        required={{
          data: {
            currentWindowLabel: 'Jun 24-Jun 30, 2026',
            previousWindowLabel: 'Jun 17-Jun 23, 2026',
            comparisonPercent: '+18%',
            incomeAmount: 'EUR 300.00',
            expenseAmount: 'EUR 180.00',
            netFlowAmount: '+EUR 120.00',
            incomeShare: 100,
            expenseShare: 60,
            highlights: [
              {
                key: 'expense',
                label: 'Biggest expense',
                title: 'Shopping',
                subtitle: 'Mall',
                amount: '-EUR 180.00',
                occurredOn: 'Jun 12, 2026',
                iconClassName: 'bi bi-bag',
                tone: 'expense',
              },
              {
                key: 'income',
                label: 'Biggest income',
                title: 'Work income',
                subtitle: 'Employer',
                amount: '+EUR 950.00',
                occurredOn: 'Jun 1, 2026',
                iconClassName: 'bi bi-briefcase',
                tone: 'income',
              },
            ],
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jun 24-Jun 30, 2026' })).toBeInTheDocument();
    expect(screen.getByText('Compared to Jun 17-Jun 23, 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income vs Expenses' })).toBeInTheDocument();
    expect(screen.getByText('+18%')).toBeInTheDocument();
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
    expect(screen.queryByText('Income')).not.toBeInTheDocument();
    expect(screen.queryByText('Expenses')).not.toBeInTheDocument();
    expect(screen.getByText('Net flow')).toBeInTheDocument();
    expect(screen.getByText('Biggest expense')).toBeInTheDocument();
    expect(screen.getByText('Biggest income')).toBeInTheDocument();
  });

  it('renders a shaped skeleton while loading', () => {
    render(
      <OverviewSnapshotCardView
        required={{
          data: {
            currentWindowLabel: '',
            previousWindowLabel: undefined,
            incomeAmount: '',
            expenseAmount: '',
            netFlowAmount: '',
            incomeShare: 0,
            expenseShare: 0,
            highlights: [],
          },
          status: { loading: true },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading overview snapshot' })).toBeInTheDocument();
  });

  it('renders net flow and comparison in negative tone when the period is below zero', () => {
    render(
      <OverviewSnapshotCardView
        required={{
          data: {
            currentWindowLabel: 'Jul 3-Jul 9, 2026',
            previousWindowLabel: 'Jun 26-Jul 2, 2026',
            comparisonPercent: '-129.44%',
            incomeAmount: 'EUR 168.00',
            expenseAmount: 'EUR 100,100.00',
            netFlowAmount: '-EUR 99,932.00',
            incomeShare: 4,
            expenseShare: 100,
            highlights: [],
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByText('-EUR 99,932.00')).toHaveClass(styles.netFlowAmountNegative);
    expect(screen.getByText('-129.44%').parentElement).toHaveClass(styles.comparisonBadgeNegative);
  });
});
