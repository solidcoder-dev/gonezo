import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowProjectionCardView } from './FlowProjectionCardView';

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children?: ReactNode }) => <div data-testid="line-chart">{children}</div>,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe('FlowProjectionCardView', () => {
  it('renders the balance summary in two rows and the navigation controls', () => {
    render(
      <FlowProjectionCardView
        required={{
          data: {
            windowLabel: 'Jun 1-Jun 30, 2026',
            currentMarkerLabel: 'Jun 12',
            currentBalanceAmount: '€2,430.00',
            expectedEndBalanceAmount: '€2,790.00',
            lowestPointAmount: '€1,180.00',
            lowestPointLabel: 'Jul 24',
            points: [],
          },
          state: {
            canGoPreviousWindow: true,
            canGoNextWindow: false,
          },
          status: { loading: false },
        }}
        provided={{
          commands: {
            goToPreviousWindow: vi.fn(),
            goToNextWindow: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Balance projection' })).toBeInTheDocument();
    expect(screen.getByText('Current balance')).toBeInTheDocument();
    expect(screen.getByText('Expected end balance')).toBeInTheDocument();
    expect(screen.getByText('Lowest point')).toBeInTheDocument();
    expect(screen.getByText('Jun 1-Jun 30, 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous cash flow window' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next cash flow window' })).toBeDisabled();
  });
});
