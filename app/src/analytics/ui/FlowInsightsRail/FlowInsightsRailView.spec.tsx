import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowInsightsRailView } from './FlowInsightsRailView';

describe('FlowInsightsRailView', () => {
  it('renders compact insight cards in a horizontal rail', () => {
    render(
      <FlowInsightsRailView
        required={{
          data: {
            items: [
              { key: 'best-day', title: 'Best day', subtitle: 'Jul 1', amount: '€339.00', tone: 'income' },
              { key: 'worst-day', title: 'Worst day', subtitle: 'Jul 9', amount: '€100.13', tone: 'expense' },
              { key: 'average', title: 'Average day', subtitle: 'Across days', amount: '€7.98', tone: 'neutral' },
            ],
          },
          status: { loading: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Flow insights' })).toBeInTheDocument();
    expect(screen.getByText('Best day')).toBeInTheDocument();
    expect(screen.getByText('Worst day')).toBeInTheDocument();
    expect(screen.getByText('Average day')).toBeInTheDocument();
    expect(screen.getByText('€339.00')).toBeInTheDocument();
    expect(screen.getByText('€100.13')).toBeInTheDocument();
    expect(screen.getByText('€7.98')).toBeInTheDocument();
  });
});
