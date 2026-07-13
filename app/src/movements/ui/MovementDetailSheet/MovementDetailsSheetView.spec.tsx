import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementDetailsSheetViewProps } from './MovementDetailsSheetView';
import { MovementDetailsSheetView } from './MovementDetailsSheetView';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';

function postedMovement(overrides: Partial<Extract<MovementDetailViewModel, { source: 'posted' }>> = {}): Extract<MovementDetailViewModel, { source: 'posted' }> {
  return {
    id: 'tx-1',
    source: 'posted',
    raw: {
      id: 'tx-1',
      accountId: 'account-1',
      accountName: 'Revolut',
      occurredAt: '2026-07-12T13:42:00.000Z',
      description: 'Weekly family grocery run',
      merchant: 'Mercadona',
      amount: '48.20',
      currency: 'EUR',
      type: 'expense',
      status: 'posted',
      items: [],
      ignored: false,
    },
    financialType: 'expense',
    title: 'Mercadona',
    accountLabel: 'Revolut',
    dateLabel: 'Today, 13:42',
    amount: { value: '48.20', currency: 'EUR', sign: '-' },
    category: { id: 'cat-1', name: 'Groceries' },
    tags: [{ id: 'tag-1', name: 'Home' }, { id: 'tag-2', name: 'Trip' }],
    items: [],
    merchant: 'Mercadona',
    note: 'Weekly family grocery run',
    canOpenItems: false,
    status: 'posted',
    ignored: false,
    canEditCategory: true,
    canEditTags: true,
    canToggleIgnored: true,
    canVoid: true,
    sharing: { phase: 'loaded', value: null },
    postedAtLabel: '12 Jul 2026 13:42',
    ...overrides,
  };
}

function scheduledMovement(overrides: Partial<Extract<MovementDetailViewModel, { source: 'scheduled' }>> = {}): Extract<MovementDetailViewModel, { source: 'scheduled' }> {
  return {
    id: 'sch-1',
    source: 'scheduled',
    raw: {
      id: 'sch-1',
      type: 'expense',
      sourceAccountId: 'account-1',
      accountName: 'Revolut',
      amount: '48.20',
      currency: 'EUR',
      status: 'active',
      startAt: '2026-07-12T00:00:00.000Z',
      nextDueAt: '2026-07-20T00:00:00.000Z',
      zoneId: 'UTC',
      generatedOccurrences: 2,
      splitItems: [],
      rule: { frequency: 'monthly', interval: 1, monthlyPattern: 'day_of_month', dayOfMonth: 20 },
      recurrenceEnd: { kind: 'never' },
      categoryId: 'cat-1',
      tagIds: ['tag-1'],
      tagNames: ['Home'],
      scheduleKind: 'recurring',
      origin: 'recurring',
    },
    financialType: 'expense',
    title: 'Rent',
    accountLabel: 'Revolut',
    dateLabel: '20 Jul',
    amount: { value: '48.20', currency: 'EUR', sign: '-' },
    category: { id: 'cat-1', name: 'Groceries' },
    tags: [{ id: 'tag-1', name: 'Home' }],
    items: [],
    note: 'Monthly rent',
    canOpenItems: false,
    status: 'active',
    lifecycleChip: 'Scheduled',
    canEditCategory: true,
    canEditTags: true,
    canDeactivate: true,
    nextDueLabel: '20 Jul 2026',
    scheduleSummary: 'Every month',
    originLabel: 'Recurring',
    ...overrides,
  };
}

function expectedMovement(overrides: Partial<Extract<MovementDetailViewModel, { source: 'expected' }>> = {}): Extract<MovementDetailViewModel, { source: 'expected' }> {
  return {
    id: 'exp-1',
    source: 'expected',
    raw: {
      id: 'exp-1',
      accountId: 'account-1',
      accountName: 'Revolut',
      type: 'expense',
      amount: '48.20',
      currency: 'EUR',
      expectedAt: '2026-07-12T13:42:00.000Z',
      splitItems: [],
      status: 'pending',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      ignored: true,
      merchant: 'Mercadona',
      description: 'Weekly family grocery run',
      categoryId: 'cat-1',
    },
    financialType: 'expense',
    title: 'Mercadona',
    accountLabel: 'Revolut',
    dateLabel: 'Today, 13:42',
    amount: { value: '48.20', currency: 'EUR', sign: '-' },
    category: { id: 'cat-1', name: 'Groceries' },
    tags: [],
    items: [],
    merchant: 'Mercadona',
    note: 'Weekly family grocery run',
    canOpenItems: false,
    status: 'pending',
    lifecycleChip: 'Expected',
    ignored: true,
    canEditCategory: true,
    canToggleIgnored: true,
    canEditExpected: true,
    canPostExpected: true,
    expectedAtLabel: '12 Jul 2026 13:42',
    originLabel: 'Manual',
    ...overrides,
  };
}

function renderView(overrides: Partial<MovementDetailsSheetViewProps['required']> = {}, commandOverrides: Partial<MovementDetailsSheetViewProps['provided']['commands']> = {}) {
  const commands = makeCommands(commandOverrides);

  render(
    <MovementDetailsSheetView
      required={{
        state: {
          open: true,
          screen: 'summary',
          overflowOpen: false,
          categoryQuery: '',
          tagsQuery: '',
        },
        data: {
          movement: postedMovement(),
          categories: [{ id: 'cat-1', name: 'Groceries' }],
          draftTags: [],
          suggestedTags: [{ id: 'tag-1', name: 'Home' }],
        },
        status: {
          savingCategory: false,
          savingTags: false,
          togglingIgnored: false,
          deactivating: false,
          pendingVoid: false,
        },
        ...overrides,
      }}
      provided={{ commands }}
    />,
  );
  return commands;
}

function makeCommands(commandOverrides: Partial<MovementDetailsSheetViewProps['provided']['commands']> = {}) {
  return {
    close: vi.fn(),
    back: vi.fn(),
    toggleOverflow: vi.fn(),
    openCategoryScreen: vi.fn(),
    openTagsScreen: vi.fn(),
    openSharingScreen: vi.fn(),
    openItemsScreen: vi.fn(),
    openMoreScreen: vi.fn(),
    setCategoryQuery: vi.fn(),
    setTagsQuery: vi.fn(),
    saveCategory: vi.fn(),
    toggleDraftTag: vi.fn(),
    saveTags: vi.fn(),
    setIgnored: vi.fn(),
    runOverflowAction: vi.fn(),
    deactivateScheduledMovement: vi.fn(),
    postExpectedMovement: vi.fn(),
    ...commandOverrides,
  };
}

function NavigationHarness({ movement }: { movement: MovementDetailViewModel }) {
  const [screenState, setScreenState] = useState<MovementDetailsSheetViewProps['required']['state']['screen']>('summary');
  return (
    <MovementDetailsSheetView
      required={{
        state: {
          open: true,
          screen: screenState,
          overflowOpen: false,
          categoryQuery: '',
          tagsQuery: '',
        },
        data: {
          movement,
          categories: [{ id: 'cat-1', name: 'Groceries' }],
          draftTags: movement.tags,
          suggestedTags: [{ id: 'tag-3', name: 'Family' }],
        },
        status: {
          savingCategory: false,
          savingTags: false,
          togglingIgnored: false,
          deactivating: false,
          pendingVoid: false,
        },
      }}
      provided={{
        commands: {
          close: vi.fn(),
          back: () => setScreenState('summary'),
          toggleOverflow: vi.fn(),
          openCategoryScreen: () => setScreenState('category'),
          openTagsScreen: () => setScreenState('tags'),
          openSharingScreen: () => setScreenState('sharing'),
          openItemsScreen: () => setScreenState('items'),
          openMoreScreen: () => setScreenState('more'),
          setCategoryQuery: vi.fn(),
          setTagsQuery: vi.fn(),
          saveCategory: vi.fn(),
          toggleDraftTag: vi.fn(),
          saveTags: vi.fn(),
          setIgnored: vi.fn(),
          runOverflowAction: vi.fn(),
          deactivateScheduledMovement: vi.fn(),
          postExpectedMovement: vi.fn(),
        },
      }}
    />
  );
}

describe('MovementDetailsSheetView', () => {
  it('uses expense hero styling', () => {
    renderView({ data: { movement: postedMovement() } as MovementDetailsSheetViewProps['required']['data'] });
    expect(document.querySelector('.movement-details-hero--expense')).not.toBeNull();
  });

  it('uses income hero styling', () => {
    renderView({ data: { movement: postedMovement({ financialType: 'income', amount: { value: '48.20', currency: 'EUR', sign: '+' } }) } as MovementDetailsSheetViewProps['required']['data'] });
    expect(document.querySelector('.movement-details-hero--income')).not.toBeNull();
  });

  it('uses transfer hero styling and hides category', () => {
    renderView({ data: { movement: postedMovement({ financialType: 'transfer', amount: { value: '48.20', currency: 'EUR', sign: '' }, canEditCategory: false }) } as MovementDetailsSheetViewProps['required']['data'] });
    expect(document.querySelector('.movement-details-hero--transfer')).not.toBeNull();
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('shows expected lifecycle without losing financial type', () => {
    renderView({ data: { movement: expectedMovement() } as MovementDetailsSheetViewProps['required']['data'] });
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });

  it('shows scheduled lifecycle without losing financial type', () => {
    renderView({ data: { movement: scheduledMovement() } as MovementDetailsSheetViewProps['required']['data'] });
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('opens only the category view', () => {
    render(<NavigationHarness movement={postedMovement()} />);
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    expect(screen.getByPlaceholderText('Search categories')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search tags')).not.toBeInTheDocument();
  });

  it('opens only the tags view', () => {
    render(<NavigationHarness movement={postedMovement()} />);
    fireEvent.click(screen.getByRole('button', { name: /tags/i }));
    expect(screen.getByPlaceholderText('Search tags')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search categories')).not.toBeInTheDocument();
  });

  it('shows sharing only when sharing exists', () => {
    const { rerender } = render(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: {
            movement: postedMovement({ sharing: { phase: 'loaded', value: { participantCount: 2, personalExpenseAmount: '16.07', totalAmount: '48.20', currency: 'EUR', participants: [] } } }),
            categories: [],
            draftTags: [],
            suggestedTags: [],
          },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.getByText(/Shared with 2 people/i)).toBeInTheDocument();

    rerender(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement({ sharing: { phase: 'loaded', value: null } }), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.queryByText(/Shared with/i)).not.toBeInTheDocument();
  });

  it('renders sharing as read-only without edit or remove actions', () => {
    render(<NavigationHarness movement={postedMovement({ sharing: { phase: 'loaded', value: { participantCount: 2, personalExpenseAmount: '16.07', totalAmount: '48.20', currency: 'EUR', participants: [{ id: '1', name: 'Ana', amount: '16.07' }] } }, canOpenItems: false })} />);
    fireEvent.click(screen.getByRole('button', { name: /shared with/i }));
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
  });

  it('renders items only when they exist and keeps them read-only', () => {
    render(<NavigationHarness movement={postedMovement({ canOpenItems: true, items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }] })} />);
    fireEvent.click(screen.getByRole('button', { name: /items/i }));
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.queryByText(/Add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
  });

  it('shows the expected footer only for expected movements', () => {
    const { rerender } = render(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Post movement' })).toBeInTheDocument();

    rerender(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Post movement' })).not.toBeInTheDocument();
  });

  it('shows only the correct overflow action for each movement type', () => {
    const postedCommands = renderView({
      state: { open: true, screen: 'summary', overflowOpen: true, categoryQuery: '', tagsQuery: '' },
      data: { movement: postedMovement(), categories: [], draftTags: [], suggestedTags: [], overflowActionLabel: 'Void movement' },
    });
    expect(screen.getByText('Void movement')).toBeInTheDocument();
    expect(screen.queryByText('Deactivate movement')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit expected')).not.toBeInTheDocument();
    postedCommands.close();
  });

  it('shows only edit expected for expected movements and hides tags', () => {
    renderView({
      state: { open: true, screen: 'summary', overflowOpen: true, categoryQuery: '', tagsQuery: '' },
      data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [], overflowActionLabel: 'Edit expected' },
    });
    expect(screen.getByText('Edit expected')).toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('shows only relevant more details fields', () => {
    render(
      <NavigationHarness movement={scheduledMovement({ financialType: 'transfer', targetAccountLabel: 'Savings' })} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /more details/i }));
    expect(screen.getByText('Source account')).toBeInTheDocument();
    expect(screen.getByText('Target account')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.queryByText('Posted at')).not.toBeInTheDocument();
  });

  it('shows ignore in analytics only where supported', () => {
    const { rerender } = render(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'more', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.getByText('Ignore in analytics')).toBeInTheDocument();

    rerender(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'more', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: scheduledMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );
    expect(screen.queryByText('Ignore in analytics')).not.toBeInTheDocument();
  });
});
