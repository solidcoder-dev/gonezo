import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpendingTimelineCardComponent } from './SpendingTimelineCardComponent';
import type { AnalyticsSpendingTimelineResult } from './analytics.port';

describe('SpendingTimelineCardComponent', () => {
  it('navigates the selected timeline period window with the header arrows', async () => {
    const analyticsGetSpendingTimeline = vi.fn(async (input): Promise<AnalyticsSpendingTimelineResult> => ({
      currentWindow: {
        label: input.periodOffset === -1 ? 'May 2-May 31, 2026' : 'Jun 1-Jun 30, 2026',
        startDate: input.periodOffset === -1 ? '2026-05-02T00:00:00.000Z' : '2026-06-01T00:00:00.000Z',
        endDate: input.periodOffset === -1 ? '2026-05-31T23:59:59.999Z' : '2026-06-30T23:59:59.999Z',
      },
      window: {
        label: input.periodOffset === -1 ? 'May 2-May 31, 2026' : 'Jun 1-Jun 30, 2026',
        periodOffset: input.periodOffset ?? 0,
        canGoPrevious: true,
        canGoNext: (input.periodOffset ?? 0) < 0,
      },
      points: [
        { periodKey: '2026-06-01T00:00:00.000Z', label: 'Jun 1', amount: '40.00' },
      ],
    }));

    render(
      <SpendingTimelineCardComponent
        required={{
          context: {
            core: { analyticsGetSpendingTimeline },
          },
          config: {
            enabled: true,
            currency: 'EUR',
            filters: { period: '30D' },
            refreshSignal: false,
          },
        }}
      />,
    );

    expect(await screen.findByText('Jun 1-Jun 30, 2026')).toBeInTheDocument();
    expect(analyticsGetSpendingTimeline).toHaveBeenCalledWith(expect.objectContaining({ periodOffset: 0 }));

    fireEvent.click(screen.getByRole('button', { name: 'Previous spending window' }));

    await waitFor(() => expect(analyticsGetSpendingTimeline).toHaveBeenCalledWith(expect.objectContaining({ periodOffset: -1 })));
    expect(await screen.findByText('May 2-May 31, 2026')).toBeInTheDocument();
  });
});
