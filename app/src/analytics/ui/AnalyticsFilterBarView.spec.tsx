import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsFilterBarView } from './AnalyticsFilterBarView';

describe('Analytics navigation and filters', () => {
  it('keeps the primary context controls aligned without horizontal scrolling', () => {
    render(
      <AnalyticsFilterBarView
        required={{
          state: { currency: 'EUR', period: { kind: 'thisMonth' }, moreFiltersCount: 2 },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            openCurrencySheet: vi.fn(),
            openPeriodSheet: vi.fn(),
            openMoreFiltersSheet: vi.fn(),
          },
        }}
      />,
    );

    const filters = screen.getByLabelText('Analytics filters');
    expect(filters).toHaveClass('d-flex', 'flex-nowrap', 'justify-content-between');
    expect(filters).not.toHaveClass('overflow-x-auto');
    expect(filters.querySelectorAll('button')).toHaveLength(3);
    expect(screen.getByLabelText('Open more filters')).toHaveClass('btn');
    expect(screen.getByLabelText('Open more filters')).not.toHaveClass('rounded-pill');
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('2')).not.toHaveClass('text-bg-primary');
  });
});
