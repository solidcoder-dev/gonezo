import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeRecentMovementsComponent, type HomeRecentMovementsPort } from './HomeRecentMovementsComponent';

function emptyOverview(overrides = {}) {
  return {
    scheduledPreview: { items: [], total: 0, hasMore: false },
    expectedPreview: { items: [], total: 0, hasMore: false },
    postedPage: {
      content: [],
      page: 0,
      size: 3,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
    executedPage: {
      content: [],
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
    ...overrides,
  };
}

function createPort(): HomeRecentMovementsPort {
  return {
    movementsGetOverview: vi.fn(async () => emptyOverview({
      postedPage: {
        content: [
          {
            id: 'tx-1',
            accountId: 'acc-1',
            accountName: 'bbva',
            occurredAt: '2026-06-24T10:00:00.000Z',
            merchant: 'Cafe',
            amount: '10.00',
            currency: 'EUR',
            type: 'expense',
            status: 'posted',
            ignored: true,
            items: [],
          },
        ],
        page: 0,
        size: 3,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    })),
  };
}

describe('HomeRecentMovementsComponent', () => {
  it('loads recent movements independently from the overview port', async () => {
    const core = createPort();

    render(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    expect(screen.getByLabelText('Loading recent movements')).toBeInTheDocument();

    await waitFor(() => expect(core.movementsGetOverview).toHaveBeenCalledWith(expect.objectContaining({
      postedPagination: { page: 0, size: 3 },
      expectedPreviewSize: 0,
      scheduledPreviewSize: 0,
    })));
    expect(await screen.findByText('Cafe')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent movements' })).toBeInTheDocument();
  });

  it('keeps ignored recent movements faded but clickable', async () => {
    const core = createPort();

    render(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    const movementButton = await screen.findByRole('button', { name: /Cafe/i });
    expect(movementButton.className).toContain('ignored');
    expect(movementButton).toBeEnabled();
  });

  it('opens recent movement details when a row is selected', async () => {
    const core = createPort();

    render(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Cafe/i }));

    expect(await screen.findByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByText('posted')).toBeInTheDocument();
  });
});
