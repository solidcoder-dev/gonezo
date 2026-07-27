import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingTabComponent } from './SpendingTabComponent';
import type { AnalyticsPort } from './analytics.port';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function createCore(): AnalyticsPort {
  return {
    analyticsGetSpendingReport: vi.fn(async () => ({
      window: { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false },
      currency: 'EUR', totalExpense: { value: '840.00', currency: 'EUR' }, previousExpense: { value: '1000.00', currency: 'EUR' }, changePercent: -16,
      timeline: [], categories: [],
    })),
    analyticsGetAnalyticsTopExpenses: vi.fn(async () => ({
      window: { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false }, items: [], totalCount: 0,
    })),
  } as unknown as AnalyticsPort;
}

describe('SpendingTabComponent', () => {
  it('loads report and top expenses independently', async () => {
    const reportDeferred = deferred<Awaited<ReturnType<NonNullable<AnalyticsPort['analyticsGetSpendingReport']>>>>();
    const topDeferred = deferred<Awaited<ReturnType<NonNullable<AnalyticsPort['analyticsGetAnalyticsTopExpenses']>>>>();
    const core = createCore();
    core.analyticsGetSpendingReport = vi.fn(() => reportDeferred.promise);
    core.analyticsGetAnalyticsTopExpenses = vi.fn(() => topDeferred.promise);

    render(<SpendingTabComponent required={{ context: { core }, config: { enabled: true, currency: 'EUR', refreshSignal: false } }} />);
    expect(screen.getByRole('status', { name: 'Loading spending summary' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading top expenses' })).toBeInTheDocument();
    await act(async () => {
      reportDeferred.resolve({ window: { start: '2026-06-01', endExclusive: '2026-07-01', selection: { period: { kind: 'thisMonth' }, shift: 0 }, canGoPrevious: true, canGoNext: false }, currency: 'EUR', totalExpense: { value: '840.00', currency: 'EUR' }, timeline: [], categories: [] });
      await reportDeferred.promise;
    });
    await waitFor(() => expect(screen.getByText('€840.00')).toBeInTheDocument());
    expect(screen.getByRole('status', { name: 'Loading top expenses' })).toBeInTheDocument();
  });
});
