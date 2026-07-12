import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        { id: 'tag-trip', name: 'Trip Tenerife' },
        { id: 'tag-family', name: 'Family' },
      ],
    })),
    analyticsGetCashFlowSeries: vi.fn(async (input) => ({
      currencies: ['EUR', 'USD'],
      selectedCurrency: input.currency,
      granularity: input.granularity,
      totals: { incomeAmount: '1000.00', expenseAmount: '250.00' },
      window: { label: 'Jan 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoPrevious: true, canGoNext: false },
      points: [{ periodKey: '2026-06', label: 'Jun', incomeAmount: '1000.00', expenseAmount: '250.00' }],
    })),
    analyticsGetOverviewSnapshot: vi.fn(async (input) => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
      },
      currentTotals: {
        incomeAmount: input.filters?.includeIgnoredMovements ? '1400.00' : '1000.00',
        expenseAmount: '250.00',
        netFlowAmount: input.filters?.includeIgnoredMovements ? '1150.00' : '750.00',
      },
      previousTotals: {
        incomeAmount: '800.00',
        expenseAmount: '200.00',
        netFlowAmount: '600.00',
      },
      netFlowChangePercent: '25.00',
      biggestExpense: {
        movementId: 'expense-1',
        title: 'Shopping',
        subtitle: 'Mall',
        amount: '250.00',
        occurredAt: '2026-06-12T00:00:00.000Z',
      },
      biggestIncome: {
        movementId: 'income-1',
        title: 'Work income',
        subtitle: 'Employer',
        amount: '1000.00',
        occurredAt: '2026-06-01T00:00:00.000Z',
      },
    })),
    analyticsGetOverviewInsights: vi.fn(async () => ({
      items: [
        { key: 'topTags', title: 'Top tags', subtitle: '2 tags', amount: '240.00' },
        { key: 'transfers', title: 'Transfers', subtitle: '1 transfer', amount: '220.00' },
      ],
    }) satisfies AnalyticsOverviewInsightsResult),
    analyticsGetPeriodCashFlowSummary: vi.fn(async () => ({
      incomeAmount: '1000.00',
      expenseAmount: '250.00',
      netFlowAmount: '750.00',
    })),
    analyticsGetSpendingDashboard: vi.fn(async () => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      previousWindow: {
        label: 'May 1-May 31, 2026',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
      },
      totalExpenseAmount: '250.00',
      previousExpenseChangePercent: '25.00',
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food', amount: '250.00', percentage: 100 },
      ],
    })),
    analyticsGetSpendingTimeline: vi.fn(async () => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      window: {
        label: 'Jun 1-Jun 30, 2026',
        periodOffset: 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      points: [
        { periodKey: '2026-06-01T00:00:00.000Z', label: 'Jun 1', amount: '40.00' },
      ],
    })),
    analyticsGetFlowProjection: vi.fn(async (input) => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      window: {
        label: 'Jun 1-Jun 30, 2026',
        periodOffset: input.periodOffset ?? 0,
        canGoPrevious: true,
        canGoNext: false,
      },
      currentBalanceAmount: '1000.00',
      expectedEndBalanceAmount: '1100.00',
      lowestPointAmount: '900.00',
      lowestPointLabel: 'Jun 6',
      currentMarkerLabel: 'Jun 6',
      points: [],
    })),
    analyticsGetFlowUpcoming: vi.fn(async () => ({
      incomeItems: [],
      expenseItems: [],
    })),
    analyticsGetFlowInsights: vi.fn(async () => ({
      items: [],
    })),
    analyticsGetSpendingTopExpenses: vi.fn(async () => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      items: [],
    })),
    analyticsGetSpendingOverview: vi.fn(async (input) => ({
      granularity: input.granularity,
      window: { label: 'Jun 2026 - Jun 2026', periodOffset: 0, canGoPrevious: true, canGoNext: false },
      totalExpenseAmount: '250.00',
      categories: [
        { categoryId: 'cat-food', categoryName: 'Food', amount: '250.00', percentage: 100 },
      ],
    })),
    analyticsSetMovementIgnored: vi.fn(),
    analyticsListIgnoredMovements: vi.fn(async () => ({ movementIds: [] })),
  };
}

describe('AnalyticsPageComponent', () => {
  it('applies each global filter from its own sheet', async () => {
    const core = createCore();

    render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'EUR',
      filters: expect.objectContaining({ period: '30D', includeIgnoredMovements: false }),
    })));

    fireEvent.click(screen.getByLabelText('Open currency filter'));
    expect(screen.getByRole('dialog', { name: 'Currency filter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /USD/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      currency: 'USD',
    })));

    fireEvent.click(screen.getByLabelText('Open period filter'));
    expect(screen.getByRole('dialog', { name: 'Period filter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /90D/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ period: '90D' }),
    })));

    fireEvent.click(screen.getByLabelText('Open tags filter'));
    expect(screen.getByRole('dialog', { name: 'Tags filter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Trip Tenerife/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ tagIds: ['tag-trip'] }),
    })));
  }, 30000);

  it('shows four independent sheets and keeps More filters limited to account and ignored movements', async () => {
    const core = createCore();

    render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open more filters'));
    expect(screen.getByRole('dialog', { name: 'More analytics filters' })).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Include ignored movements')).toBeInTheDocument();
    expect(screen.queryByText('Movement type')).not.toBeInTheDocument();
    expect(screen.queryByText('Add tag')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Analytics account'), { target: { value: 'acc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Include ignored movements' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        accountIds: ['acc-1'],
        includeIgnoredMovements: true,
      }),
    })));

    fireEvent.click(screen.getByLabelText('Open more filters'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(core.analyticsGetOverviewSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        accountIds: [],
        includeIgnoredMovements: false,
      }),
    })));
  }, 15000);

  it('renders the overview snapshot before the insights rail finishes loading', async () => {
    const snapshotDeferred = deferred<Awaited<ReturnType<AnalyticsPort['analyticsGetOverviewSnapshot']>>>();
    const insightsDeferred = deferred<AnalyticsOverviewInsightsResult>();
    const core = createCore();
    core.analyticsGetOverviewSnapshot = vi.fn(() => snapshotDeferred.promise);
    core.analyticsGetOverviewInsights = vi.fn(() => insightsDeferred.promise);

    render(
      <AnalyticsPageComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    await act(async () => {
      snapshotDeferred.resolve({
        currentWindow: {
          label: 'Jun 1-Jun 30, 2026',
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-30T23:59:59.999Z',
        },
        previousWindow: {
          label: 'May 1-May 31, 2026',
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: '2026-05-31T23:59:59.999Z',
        },
        currentTotals: {
          incomeAmount: '1000.00',
          expenseAmount: '250.00',
          netFlowAmount: '750.00',
        },
        previousTotals: {
          incomeAmount: '800.00',
          expenseAmount: '200.00',
          netFlowAmount: '600.00',
        },
        netFlowChangePercent: '25.00',
        biggestExpense: {
          movementId: 'expense-1',
          title: 'Shopping',
          subtitle: 'Mall',
          amount: '250.00',
          occurredAt: '2026-06-12T00:00:00.000Z',
        },
        biggestIncome: {
          movementId: 'income-1',
          title: 'Work income',
          subtitle: 'Employer',
          amount: '1000.00',
          occurredAt: '2026-06-01T00:00:00.000Z',
        },
      });
      await snapshotDeferred.promise;
    });

    expect(await screen.findByRole('heading', { name: 'Jun 1-Jun 30, 2026' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading overview insights' })).toBeInTheDocument();

    await act(async () => {
      insightsDeferred.resolve({
        items: [
          { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: '240.00' },
          { key: 'transfers', title: 'Transfers', subtitle: '1 transfer', amount: '220.00' },
        ],
      });
      await insightsDeferred.promise;
    });

    expect(await screen.findByRole('heading', { name: 'More insights' })).toBeInTheDocument();
    expect(screen.getByText('Top tags')).toBeInTheDocument();
    expect(screen.getByText('Transfers')).toBeInTheDocument();
  }, 15000);
});
