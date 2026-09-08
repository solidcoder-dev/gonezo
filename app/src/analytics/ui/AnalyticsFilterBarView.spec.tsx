import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsFilterBarView, AnalyticsViewTabsView } from './AnalyticsFilterBarView';

describe('Analytics navigation and filters', () => {
  it('exposes three accessible tabs with the selected state', () => {
    render(
      <AnalyticsViewTabsView
        required={{ state: { viewMode: 'overview' } }}
        provided={{ commands: { selectViewMode: vi.fn() } }}
      />,
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('nav', 'nav-underline', 'nav-fill');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveClass('nav-link', 'active');
  });

  it('keeps every filter control readable in a horizontally scrollable row', () => {
    render(
      <AnalyticsFilterBarView
        required={{
          state: { currency: 'EUR', period: { kind: 'thisMonth' }, tagsSelected: true, moreFiltersCount: 2 },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            openCurrencySheet: vi.fn(),
            openPeriodSheet: vi.fn(),
            openTagSheet: vi.fn(),
            openMoreFiltersSheet: vi.fn(),
          },
        }}
      />,
    );

    const filters = screen.getByLabelText('Analytics filters');
    expect(filters).toHaveClass('d-flex', 'flex-nowrap', 'overflow-x-auto');
    expect(filters.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByLabelText('Open more filters')).toHaveClass('btn', 'rounded-pill');
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('2')).toHaveClass('badge');
  });
});
