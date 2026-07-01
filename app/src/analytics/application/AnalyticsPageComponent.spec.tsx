import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPageComponent } from './AnalyticsPageComponent';
import type { AnalyticsPort } from './analytics.port';

function createCore(): AnalyticsPort {
  return {
    analyticsListCurrencies: vi.fn(async () => ({ items: ['EUR', 'USD'] })),
    analyticsGetFilterFacets: vi.fn(async () => ({
      accounts: [{ id: 'acc-1', name: 'Main', currency: 'EUR' }],
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
      window: { label: 'Jan 2026 - Jun 2026', periodOffset: input.periodOffset ?? 0, canGoNext: false },
      points: [
        { periodKey: '2026-06', label: 'Jun', incomeAmount: '1000.00', expenseAmount: '250.00' },
      ],
    })),
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
  it('uses a global currency selector while cards load through separate use cases', async () => {
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
    await waitFor(() => expect(core.analyticsGetPeriodCashFlowSummary).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR' })));
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 }));
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({ currency: 'EUR', granularity: 'monthly', periodOffset: 0 }));

    fireEvent.click(screen.getByLabelText('Select currency'));
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));

    await waitFor(() => expect(core.analyticsGetPeriodCashFlowSummary).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD' })));
    expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD', granularity: 'monthly', periodOffset: 0 }));
    expect(core.analyticsGetSpendingOverview).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD', granularity: 'monthly', periodOffset: 0 }));

    fireEvent.click(screen.getAllByLabelText('Select period')[0]);
    fireEvent.click(screen.getByRole('button', { name: '3M' }));
    await waitFor(() => expect(core.analyticsGetCashFlowSeries).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ period: '3M' }),
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
      filters: expect.objectContaining({ period: '3M' }),
    }));
  }, 10000);
});
