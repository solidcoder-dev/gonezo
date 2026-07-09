import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPageComponent } from './AnalyticsPageComponent';
import type { AnalyticsOverviewInsightsResult, AnalyticsPort } from './analytics.port';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createCore(): AnalyticsPort {
  return {
    analyticsListCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    analyticsGetFilterFacets: vi.fn(async () => ({
      accounts: [
        { id: 'acc-1', name: 'Main', currency: 'EUR' },
        { id: 'acc-2', name: 'Travel', currency: 'USD' },
      ],
      tags: [
        { id: 'tag-alicante', name: 'Alicante 2026' },
        { id: 'tag-benidorm', name: 'Benidorm 2026' },
      ],
    })),
    analyticsGetCashFlowSeries: vi.fn(async (input) => ({
      currencies: ['EUR', 'USD'],
      selectedCurrency: input.currency,
      granularity: input.granularity,
      totals: { incomeAmount: '1000.00', expenseAmount: '250.00' },
      window: { label: 'Jan 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoPrevious: true, canGoNext: false },
      points: [
        { periodKey: '2026-06', label: 'Jun', incomeAmount: '1000.00', expenseAmount: '250.00' },
      ],
    })),
    analyticsGetOverviewSnapshot: vi.fn(async (input) => ({
      currentWindow: {
        label: input.currency === 'USD' ? 'Jun 24-Jun 30, 2026' : 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
      },
      currentTotals: {
        incomeAmount: input.currency === 'USD' ? '300.00' : '1000.00',
        expenseAmount: input.currency === 'USD' ? '100.00' : '250.00',
        netFlowAmount: input.currency === 'USD' ? '200.00' : '750.00',
      },
      previousTotals: {
        incomeAmount: '800.00',
        expenseAmount: '200.00',
        netFlowAmount: '600.00',
      },
      netFlowChangePercent: input.currency === 'USD' ? '-66.67' : '25.00',
      biggestExpense: {
        movementId: 'expense-1',
        title: 'Shopping',
        subtitle: 'Mall',
        amount: input.currency === 'USD' ? '100.00' : '250.00',
        occurredAt: '2026-06-12T00:00:00.000Z',
      },
      biggestIncome: {
        movementId: 'income-1',
        title: 'Work income',
        subtitle: 'Employer',
        amount: input.currency === 'USD' ? '300.00' : '1000.00',
        occurredAt: '2026-06-01T00:00:00.000Z',
      },
    })),
    analyticsGetOverviewInsights: vi.fn(async () => ({
      items: [
        { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: '240.00' },
        { key: 'transfers', title: 'Transfers', subtitle: '1 transfer', amount: '220.00' },
      ],
    }) satisfies AnalyticsOverviewInsightsResult),
    analyticsGetPeriodCashFlowSummary: vi.fn(async (input) => ({
      incomeAmount: input.currency === 'USD' ? '300.00' : '1000.00',
      expenseAmount: input.currency === 'USD' ? '100.00' : '250.00',
      netFlowAmount: input.currency === 'USD' ? '200.00' : '750.00',
    })),
    analyticsGetSpendingOverview: vi.fn(async (input) => ({
      granularity: input.granularity,
      window: { label: 'Jun 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoNext: false },
      totalExpenseAmount: input.currency === 'USD' ? '100.00' : '250.00',
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food', amount: input.currency === 'USD' ? '100.00' : '250.00', percentage: 100 },
      ],
    })),
    analyticsSetMovementIgnored: vi.fn(),
    analyticsListIgnoredMovements: vi.fn(async () => ({ movementIds: [] })),
  };
}

describe('AnalyticsPageComponent', () => {
  it('uses a global currency selector while each analytics tab loads its own use case', async () => {
    const core = createCore();

    const { rerender } = render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    const analyticsTabs = screen.getByRole('tablist', { name: 'Analytics views' });
    const analyticsFilters = screen.getByLabelText('Analytics filters');
    expect(analyticsTabs.compareDocumentPosition(analyticsFilters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Spending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Recurring' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Accounts' })).not.toBeInTheDocument();
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR',
      filters: expect.objectContaining({ period: '1M' }),
    })));
    await waitFor(() => expect(core.analyticsGetOverviewInsights).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR',
      filters: expect.objectContaining({ period: '1M' }),
    })));
    expect(core.analyticsGetCashFlowSeries).not.toHaveBeenCalled();
    expect(core.analyticsGetSpendingOverview).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Select currency'));
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));

    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD' })));
    await waitFor(() => expect(core.analyticsGetOverviewInsights).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD' })));

    fireEvent.click(screen.getAllByLabelText('Select period')[0]);
    expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5Y' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All period' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3M' }));
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ period: '3M' }),
    })));
    await waitFor(() => expect(core.analyticsGetOverviewInsights).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ period: '3M' }),
    })));

    fireEvent.click(screen.getByLabelText('More filters'));
    fireEvent.change(screen.getByLabelText('Analytics account'), { target: { value: 'acc-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
      filters: expect.objectContaining({ accountIds: ['acc-2'], currency: 'USD' }),
    })));
    await waitFor(() => expect(core.analyticsGetOverviewInsights).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
      filters: expect.objectContaining({ accountIds: ['acc-2'], currency: 'USD' }),
    })));

    fireEvent.click(screen.getByRole('tab', { name: 'Spending' }));
    await waitFor(() => expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
      filters: expect.objectContaining({ accountIds: ['acc-2'], period: '3M' }),
    })));

    fireEvent.click(screen.getByRole('tab', { name: 'Flow' }));
    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
      granularity: 'monthly',
      periodOffset: 0,
      filters: expect.objectContaining({ accountIds: ['acc-2'], period: '3M' }),
    })));

    const filterFacetsCallsBeforeRefresh = vi.mocked(core.analyticsGetFilterFacets).mock.calls.length;

    rerender(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: true },
        }}
      />,
    );

    await waitFor(() => expect(core.analyticsListCurrencies).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(vi.mocked(core.analyticsGetFilterFacets).mock.calls.length).toBeGreaterThan(filterFacetsCallsBeforeRefresh));
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
      filters: expect.objectContaining({ accountIds: ['acc-2'], period: '3M' }),
    }));
  }, 10000);

  it('renders the overview snapshot before the insights rail finishes loading', async () => {
    const insightsDeferred = deferred<AnalyticsOverviewInsightsResult>();
    const core = createCore();
    core.analyticsGetOverviewInsights = vi.fn(() => insightsDeferred.promise);

    render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Jun 1-Jun 30, 2026' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading overview insights' })).toBeInTheDocument();

    insightsDeferred.resolve({
      items: [
        { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: '240.00' },
        { key: 'transfers', title: 'Transfers', subtitle: '1 transfer', amount: '220.00' },
      ],
    });

    expect(await screen.findByRole('heading', { name: 'More insights' })).toBeInTheDocument();
    expect(screen.getByText('Top tags')).toBeInTheDocument();
    expect(screen.getByText('Transfers')).toBeInTheDocument();
  });
});
