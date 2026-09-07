import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeRecentMovementsComponent, type HomeRecentMovementsPort } from './HomeRecentMovementsComponent';
import { formatHomeMovementDate } from '../ui/HomeRecentMovements/formatHomeMovementDate';

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
  const overview = emptyOverview({
    postedPage: {
      content: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          occurredAt: '2026-06-24T10:00:00.000Z',
          merchant: 'Cafe',
          amount: '10.00',
          currency: 'EUR',
          type: 'expense',
          status: 'posted',
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Food' },
          tags: [
            { id: 'tag-1', name: 'Coffee' },
            { id: 'tag-2', name: 'Dining' },
          ],
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
  });
  const core = {
    movementsGetOverview: vi.fn(async () => emptyOverview({
      postedPage: {
        content: [
          {
            id: 'tx-1',
            accountId: 'acc-1',
            occurredAt: '2026-06-24T10:00:00.000Z',
            merchant: 'Cafe',
            amount: '10.00',
            currency: 'EUR',
            type: 'expense',
            status: 'posted',
            categoryId: 'cat-1',
            category: { id: 'cat-1', name: 'Food' },
            tags: [
              { id: 'tag-1', name: 'Coffee' },
              { id: 'tag-2', name: 'Dining' },
            ],
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
    movementsGetDetail: vi.fn(async ({ source, movementId }) => {
      if (source !== 'posted' || movementId !== 'tx-1') {
        return { found: false as const };
      }
      const movement = overview.postedPage.content[0];
      return {
        found: true as const,
        detail: {
          source: 'posted' as const,
          movement,
        },
      };
    }),
    taxonomyListCategories: vi.fn(async () => ({
      items: [{ id: 'cat-1', name: 'Food', appliesTo: 'expense', status: 'active' }],
    })),
    taxonomyListTags: vi.fn(async () => ({
      items: [{ id: 'tag-1', name: 'Coffee', status: 'active' }],
    })),
    ledgerListAccounts: vi.fn(async () => ({
      items: [{ id: 'acc-1', name: 'BBVA' }],
    })),
    sharingGetMovementDetails: vi.fn(async () => null),
    sharingListMovementDetails: vi.fn(async () => ({ items: [] })),
    orchestrationCategorizeTransaction: vi.fn(async () => ({ status: 'assigned', categoryId: 'cat-1' })),
    orchestrationApplyTransactionTags: vi.fn(async () => ({ status: 'assigned', tagIds: ['tag-1'] })),
    orchestrationListTransactionTaxonomy: vi.fn(async () => ({
      items: [{ transactionId: 'tx-1', categoryId: 'cat-1', tagIds: ['tag-1', 'tag-2'] }],
    })),
    analyticsSetMovementIgnored: vi.fn(async () => undefined),
    expectedUpdateMovement: vi.fn(async () => undefined),
    schedulingUpdateMovement: vi.fn(async () => undefined),
    schedulingDeactivateMovement: vi.fn(async () => undefined),
    ledgerVoidTransaction: vi.fn(async () => undefined),
  };
  return core as unknown as HomeRecentMovementsPort;
}

describe('HomeRecentMovementsComponent', () => {
  it('loads sharing metadata once for all recent movements and renders item and share counts', async () => {
    const core = createPort();
    const recentTransactions = ['tx-1', 'tx-2', 'tx-3'].map((id, index) => ({
      id,
      accountId: 'acc-1',
      occurredAt: `2026-06-24T${10 + index}:00:00.000Z`,
      merchant: `Cafe ${index + 1}`,
      amount: '10.00',
      currency: 'EUR',
      type: 'expense',
      status: 'posted',
      items: index === 0 ? [{ id: 'item-1', name: 'Coffee', amount: '10.00' }] : [],
    }));
    vi.mocked(core.movementsGetOverview).mockResolvedValue(emptyOverview({
      postedPage: { content: recentTransactions, page: 0, size: 3, totalElements: 3, totalPages: 1, hasNext: false, hasPrevious: false },
    }) as never);
    vi.mocked(core.sharingListMovementDetails).mockResolvedValue({
      items: [{
        transactionId: 'tx-1',
        shareId: 'share-1',
        participants: [{ participantId: 'participant-1' }, { participantId: 'participant-2' }],
      }],
    } as never);

    render(<HomeRecentMovementsComponent required={{ context: { core }, config: { enabled: true, refreshSignal: false } }} />);

    expect(await screen.findByText('Cafe 1')).toBeInTheDocument();
    expect(core.sharingListMovementDetails).toHaveBeenCalledTimes(1);
    expect(core.sharingListMovementDetails).toHaveBeenCalledWith({ transactionIds: ['tx-1', 'tx-2', 'tx-3'] });
    expect(screen.getByLabelText('1 item')).toBeInTheDocument();
    expect(screen.getByLabelText('2 shares')).toBeInTheDocument();
    expect(screen.queryByLabelText('0 items')).not.toBeInTheDocument();
  });

  it('keeps recent movements available when sharing metadata fails', async () => {
    const core = createPort();
    vi.mocked(core.sharingListMovementDetails).mockRejectedValue(new Error('Sharing unavailable'));

    render(<HomeRecentMovementsComponent required={{ context: { core }, config: { enabled: true, refreshSignal: false } }} />);

    expect(await screen.findByText('Cafe')).toBeInTheDocument();
    expect(screen.queryByLabelText(/share/)).not.toBeInTheDocument();
  });

  it.each([
    ['2026-06-24T23:00:00', 'Today'],
    ['2026-06-23T10:00:00', 'Yesterday'],
    ['2026-06-20T10:00:00', '20 Jun'],
  ])('formats Home movement dates as %s', (occurredOn, expected) => {
    expect(formatHomeMovementDate(occurredOn, new Date('2026-06-24T12:00:00'))).toBe(expected);
  });

  it('does not format an invalid Home movement date', () => {
    expect(formatHomeMovementDate('invalid', new Date('2026-06-24T12:00:00'))).toBeUndefined();
  });

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
    expect(screen.getByText('BBVA · Food · Coffee · Dining')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent movements' })).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
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
    expect(movementButton.closest('li')).toHaveClass('monthly-timeline-row--ignored');
    expect(screen.getByLabelText('Dining movement').querySelector('i')).toHaveClass('bi-cup-hot');
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

    expect(await screen.findByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Category/i })).toHaveTextContent('Food');
    expect(screen.getByRole('button', { name: /Tags/i })).toHaveTextContent('Coffee');

    fireEvent.click(screen.getByRole('button', { name: /Tags/i }));
    expect(await screen.findByRole('dialog', { name: 'Movement tags' })).toBeInTheDocument();
  });

  it('does not reload recent movements when only the provided wrapper identity changes', async () => {
    const core = createPort();
    const onError = vi.fn();

    const { rerender } = render(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={{
          events: {
            onError,
            onSeeAll: vi.fn(),
          },
        }}
      />,
    );

    expect(await screen.findByText('Cafe')).toBeInTheDocument();
    expect(core.movementsGetOverview).toHaveBeenCalledTimes(1);

    rerender(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={{
          events: {
            onError,
            onSeeAll: vi.fn(),
          },
        }}
      />,
    );

    await waitFor(() => expect(core.movementsGetOverview).toHaveBeenCalledTimes(1), { timeout: 250 });
    expect(screen.getByRole('button', { name: /Cafe/i })).toBeInTheDocument();
  });

  it('reloads recent movements when refreshSignal changes', async () => {
    const core = createPort();
    const onError = vi.fn();
    const provided = {
      events: {
        onError,
        onSeeAll: vi.fn(),
      },
    };

    const { rerender } = render(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: false },
        }}
        provided={provided}
      />,
    );

    expect(await screen.findByText('Cafe')).toBeInTheDocument();
    expect(core.movementsGetOverview).toHaveBeenCalledTimes(1);

    rerender(
      <HomeRecentMovementsComponent
        required={{
          context: { core },
          config: { enabled: true, refreshSignal: true },
        }}
        provided={provided}
      />,
    );

    await waitFor(() => expect(core.movementsGetOverview).toHaveBeenCalledTimes(2));
  });
});
