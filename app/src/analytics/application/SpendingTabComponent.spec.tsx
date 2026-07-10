import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingTabComponent } from './SpendingTabComponent';
import type { AnalyticsPort } from './analytics.port';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createCore(): AnalyticsPort {
  return {
    analyticsListCurrencies: vi.fn(),
    analyticsGetFilterFacets: vi.fn(),
    analyticsGetOverviewSnapshot: vi.fn(),
    analyticsGetOverviewInsights: vi.fn(),
    analyticsGetCashFlowSeries: vi.fn(),
    analyticsGetPeriodCashFlowSummary: vi.fn(),
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
      totalExpenseAmount: '840.00',
      previousExpenseChangePercent: '-24.00',
      categories: [
        { categoryId: 'shopping', categoryName: 'Shopping', amount: '180.17', percentage: 21 },
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
      points: [],
    })),
    analyticsGetSpendingTopExpenses: vi.fn(async () => ({
      currentWindow: {
        label: 'Jun 1-Jun 30, 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      },
      items: [],
    })),
    analyticsGetSpendingOverview: vi.fn(),
    analyticsSetMovementIgnored: vi.fn(),
    analyticsListIgnoredMovements: vi.fn(),
  } as unknown as AnalyticsPort;
}

describe('SpendingTabComponent', () => {
  it('renders the main spending dashboard before slower progressive sections finish', async () => {
    const dashboardDeferred = deferred<Awaited<ReturnType<AnalyticsPort['analyticsGetSpendingDashboard']>>>();
    const timelineDeferred = deferred<Awaited<ReturnType<AnalyticsPort['analyticsGetSpendingTimeline']>>>();
    const topExpensesDeferred = deferred<Awaited<ReturnType<AnalyticsPort['analyticsGetSpendingTopExpenses']>>>();
    const core = createCore();
    core.analyticsGetSpendingDashboard = vi.fn(() => dashboardDeferred.promise);
    core.analyticsGetSpendingTimeline = vi.fn(() => timelineDeferred.promise);
    core.analyticsGetSpendingTopExpenses = vi.fn(() => topExpensesDeferred.promise);

    render(
      <SpendingTabComponent
        required={{
          context: { core },
          config: { enabled: true, currency: 'EUR', refreshSignal: false },
        }}
      />,
    );

    await act(async () => {
      dashboardDeferred.resolve({
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
        totalExpenseAmount: '840.00',
        previousExpenseChangePercent: '-24.00',
        categories: [
          { categoryId: 'shopping', categoryName: 'Shopping', amount: '180.17', percentage: 21 },
        ],
      });
      await dashboardDeferred.promise;
    });

    expect(await screen.findByText('Total spending')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading spending summary' })).not.toBeInTheDocument());
    expect(screen.getByText('€840.00')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading spending timeline' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading top expenses' })).toBeInTheDocument();
  }, 10000);
});
