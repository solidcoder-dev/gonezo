import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsFilterBarView, AnalyticsViewTabsView } from './AnalyticsFilterBarView';
import styles from './AnalyticsPageView.module.css';

describe('Analytics navigation and filters', () => {
  it('uses the full-width sticky tab layout for all analytics views', () => {
    render(
      <AnalyticsViewTabsView
        required={{ state: { viewMode: 'overview' } }}
        provided={{ commands: { selectViewMode: vi.fn() } }}
      />,
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass(styles.viewTabs);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveClass(styles.viewTabActive);
  });

  it('keeps every filter control in the non-scrolling full-width row', () => {
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
    expect(filters).toHaveClass(styles.filterBar);
    expect(filters.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByLabelText('Open more filters')).toHaveClass(styles.moreFiltersButtonSelected);
  });
});
