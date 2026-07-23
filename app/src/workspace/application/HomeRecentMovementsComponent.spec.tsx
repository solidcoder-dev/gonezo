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
  } as unknown as HomeRecentMovementsPort;
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
