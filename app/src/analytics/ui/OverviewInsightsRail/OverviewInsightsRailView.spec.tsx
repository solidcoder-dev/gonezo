import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewInsightsRailView } from './OverviewInsightsRailView';

describe('OverviewInsightsRailView', () => {
  it('renders a horizontal rail of insight cards', () => {
    render(
      <OverviewInsightsRailView
        required={{
          data: {
            items: [
              { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: 'EUR 380.00', iconClassName: 'bi bi-tag', tone: 'expense' },
              { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '2 shared', amount: 'EUR 240.00', iconClassName: 'bi bi-people', tone: 'sharing' },
              { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'Ana', amount: 'EUR 320.00', iconClassName: 'bi bi-person', tone: 'sharing' },
              { key: 'recurringImpact', title: 'Recurring impact', subtitle: '1 recurring', amount: 'EUR 145.90', iconClassName: 'bi bi-arrow-repeat', tone: 'recurring' },
              { key: 'transfers', title: 'Transfers', subtitle: '4 transfers', amount: 'EUR 220.00', iconClassName: 'bi bi-arrow-left-right', tone: 'transfer' },
            ],
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'More insights' })).toBeInTheDocument();
    expect(screen.getByText('Top tags')).toBeInTheDocument();
    expect(screen.getByText('Shared expenses')).toBeInTheDocument();
    expect(screen.getByText('Most shared with')).toBeInTheDocument();
    expect(screen.getByText('Recurring impact')).toBeInTheDocument();
    expect(screen.getByText('Transfers')).toBeInTheDocument();
    expect(screen.getByText('3 tags')).toBeInTheDocument();
    expect(screen.getByText('4 transfers')).toBeInTheDocument();
  });

  it('renders a loading skeleton rail', () => {
    render(
      <OverviewInsightsRailView
        required={{
          data: { items: [] },
          status: { loading: true },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading overview insights' })).toBeInTheDocument();
  });

  it('renders zero-value insight cards when there is no matching data for the current filters', () => {
    render(
      <OverviewInsightsRailView
        required={{
          data: {
            items: [
              { key: 'topTags', title: 'Top tags', subtitle: '0 tags', amount: 'EUR 0.00', iconClassName: 'bi bi-tag', tone: 'expense' },
              { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '0 shared', amount: 'EUR 0.00', iconClassName: 'bi bi-people', tone: 'sharing' },
              { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'No data', amount: 'EUR 0.00', iconClassName: 'bi bi-person', tone: 'sharing' },
              { key: 'recurringImpact', title: 'Recurring impact', subtitle: '0 recurring', amount: 'EUR 0.00', iconClassName: 'bi bi-arrow-repeat', tone: 'recurring' },
              { key: 'transfers', title: 'Transfers', subtitle: '0 transfers', amount: 'EUR 0.00', iconClassName: 'bi bi-arrow-left-right', tone: 'transfer' },
            ],
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByText('Top tags')).toBeInTheDocument();
    expect(screen.getByText('0 tags')).toBeInTheDocument();
    expect(screen.getAllByText('EUR 0.00')).toHaveLength(5);
    expect(screen.getByText('0 transfers')).toBeInTheDocument();
  });
});
