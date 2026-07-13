import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import type { MovementDetailsSheetViewProps } from './MovementDetailsSheetView';
import { MovementDetailsSheetView } from './MovementDetailsSheetView';

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
      amount: '15.00',
      currency: 'EUR',
      type: 'expense',
      status: 'posted',
      items: [],
      ignored: false,
      tags: [{ id: 'tag-1', name: 'Home' }, { id: 'tag-2', name: 'Trip' }],
    },
    financialType: 'expense',
    title: 'Mercadona',
    accountLabel: 'Revolut',
    dateLabel: 'Today, 13:42',
    amount: { value: '15.00', currency: 'EUR', sign: '-' },
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

function makeCommands(commandOverrides: Partial<MovementDetailsSheetViewProps['provided']['commands']> = {}) {
  return {
    close: vi.fn(),
    dismissSubview: vi.fn(),
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

function renderView(
  overrides: Partial<MovementDetailsSheetViewProps['required']> = {},
  commandOverrides: Partial<MovementDetailsSheetViewProps['provided']['commands']> = {},
) {
  const commands = makeCommands(commandOverrides);
  const required: MovementDetailsSheetViewProps['required'] = {
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
      draftTags: [{ id: 'tag-1', name: 'Home' }],
      suggestedTags: [{ id: 'tag-2', name: 'Trip' }],
    },
    status: {
      savingCategory: false,
      savingTags: false,
      tagsDirty: false,
      togglingIgnored: false,
      deactivating: false,
      pendingVoid: false,
    },
    ...overrides,
  };

  render(<MovementDetailsSheetView required={required} provided={{ commands }} />);
  return { commands, required };
}

describe('MovementDetailsSheetView', () => {
  it('uses dismissSubview in the contract instead of back', () => {
    const { commands } = renderView();
    expect(commands).toHaveProperty('dismissSubview');
    expect(commands).not.toHaveProperty('back');
  });

  it('keeps the summary close button and the drag handle visible', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Close movement details' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-drag-handle')).toBeInTheDocument();
  });

  it('renders the amount as a single node', () => {
    renderView();
    const amount = document.querySelector('.movement-details-hero-amount');
    expect(amount?.textContent).toBe('-€15.00');
  });

  it('closes the summary on backdrop click', () => {
    const { commands } = renderView();
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(commands.close).toHaveBeenCalledTimes(1);
    expect(commands.dismissSubview).not.toHaveBeenCalled();
  });

  it('dismisses a subview on backdrop click', () => {
    const { commands } = renderView({
      state: {
        open: true,
        screen: 'category',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    });

    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(commands.dismissSubview).toHaveBeenCalledTimes(1);
    expect(commands.close).not.toHaveBeenCalled();
  });

  it('does not dismiss the category subview while saving', () => {
    const { commands } = renderView({
      state: {
        open: true,
        screen: 'category',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      status: {
        savingCategory: true,
        savingTags: false,
        tagsDirty: false,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    });

    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(commands.dismissSubview).not.toHaveBeenCalled();
    expect(commands.close).not.toHaveBeenCalled();
  });

  it('does not dismiss the tags subview while saving', () => {
    const { commands } = renderView({
      state: {
        open: true,
        screen: 'tags',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      status: {
        savingCategory: false,
        savingTags: true,
        tagsDirty: true,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    });

    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(commands.dismissSubview).not.toHaveBeenCalled();
    expect(commands.close).not.toHaveBeenCalled();
  });

  it('shows no back arrow or back copy in category', () => {
    renderView({
      state: {
        open: true,
        screen: 'category',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    });

    expect(screen.queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Back to movement')).not.toBeInTheDocument();
  });

  it('shows no back arrow or back copy in tags', () => {
    renderView({
      state: {
        open: true,
        screen: 'tags',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      status: {
        savingCategory: false,
        savingTags: false,
        tagsDirty: true,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    });

    expect(screen.queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Back to movement')).not.toBeInTheDocument();
  });

  it('shows no back arrow or back copy in sharing', () => {
    renderView({
      state: {
        open: true,
        screen: 'sharing',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      data: {
        movement: postedMovement({
          sharing: {
            phase: 'loaded',
            value: {
              participantCount: 2,
              personalExpenseAmount: '5.00',
              totalAmount: '15.00',
              currency: 'EUR',
              participants: [{ id: 'p-1', name: 'Ana', amount: '5.00' }],
            },
          },
        }),
        categories: [],
        draftTags: [],
        suggestedTags: [],
      },
    });

    expect(screen.queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Back to movement')).not.toBeInTheDocument();
  });

  it('shows no back arrow or back copy in items', () => {
    renderView({
      state: {
        open: true,
        screen: 'items',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      data: {
        movement: postedMovement({
          canOpenItems: true,
          items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }],
        }),
        categories: [],
        draftTags: [],
        suggestedTags: [],
      },
    });

    expect(screen.queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Back to movement')).not.toBeInTheDocument();
  });

  it('shows no back arrow or back copy in more details', () => {
    renderView({
      state: {
        open: true,
        screen: 'more',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    });

    expect(screen.queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Back to movement')).not.toBeInTheDocument();
  });

  it('renders tags done in the footer and disables it when nothing changed', () => {
    renderView({
      state: {
        open: true,
        screen: 'tags',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    });

    const done = screen.getByRole('button', { name: 'Done' });
    expect(done.closest('.movement-details-footer')).not.toBeNull();
    expect(done).toBeDisabled();
  });

  it('enables tags done when the draft changed', () => {
    renderView({
      state: {
        open: true,
        screen: 'tags',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      status: {
        savingCategory: false,
        savingTags: false,
        tagsDirty: true,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    });

    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it('disables tags done while saving', () => {
    renderView({
      state: {
        open: true,
        screen: 'tags',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      status: {
        savingCategory: false,
        savingTags: true,
        tagsDirty: true,
        togglingIgnored: false,
        deactivating: false,
        pendingVoid: false,
      },
    });

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('keeps the expected footer in summary only', () => {
    const { rerender } = render(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Post movement' })).toBeInTheDocument();

    rerender(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'more', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Post movement' })).not.toBeInTheDocument();
  });

  it('hides the movement section title when only more details is available', () => {
    renderView({
      data: {
        movement: postedMovement({ items: [], sharing: { phase: 'loaded', value: null } }),
        categories: [],
        draftTags: [],
        suggestedTags: [],
      },
    });

    expect(screen.getAllByText(/^Movement$/)).toHaveLength(1);
  });

  it('shows the movement section title when sharing or items exist', () => {
    renderView({
      data: {
        movement: postedMovement({
          canOpenItems: true,
          items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }],
        }),
        categories: [],
        draftTags: [],
        suggestedTags: [],
      },
    });

    expect(screen.getAllByText(/^Movement$/)).toHaveLength(2);
  });

  it('keeps scheduled and expected lifecycle chips', () => {
    const { rerender } = render(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: scheduledMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(
      <MovementDetailsSheetView
        required={{
          state: { open: true, screen: 'summary', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
