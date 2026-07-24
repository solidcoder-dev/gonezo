import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewSnapshotCardView } from './OverviewSnapshotCardView';
import styles from './OverviewSnapshotCardView.module.css';

describe('OverviewSnapshotCardView', () => {
  it('renders the open financial summary without highlight cards', () => {
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
            netFlowTone: 'income',
            comparisonTone: 'income',
            comparisonDirection: 'up',
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jun 24-Jun 30, 2026' })).toBeInTheDocument();
    expect(screen.getByText('Compared to Jun 17-Jun 23, 2026')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('+18%')).toBeInTheDocument();
    expect(screen.getByText('vs previous period')).toBeInTheDocument();
    expect(screen.getByText('Net flow')).toBeInTheDocument();
    expect(screen.queryByText('Income vs Expenses')).not.toBeInTheDocument();
    expect(screen.queryByText('Biggest expense')).not.toBeInTheDocument();
    expect(screen.queryByText('Biggest income')).not.toBeInTheDocument();
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
            netFlowTone: 'neutral',
            comparisonTone: 'neutral',
            comparisonDirection: 'flat',
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
            netFlowTone: 'expense',
            comparisonTone: 'expense',
            comparisonDirection: 'down',
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByText('-EUR 99,932.00')).toHaveClass(styles.netFlowAmountExpense);
    expect(screen.getByText('-129.44%').parentElement).toHaveClass(styles.comparisonBadgeExpense);
  });
});
