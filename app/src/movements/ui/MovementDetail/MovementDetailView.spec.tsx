import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import { MovementDetailView, type MovementDetailViewProps } from './MovementDetailView';
import { MovementDetailsSheetPreview } from '../MovementDetailSheet/MovementDetailsSheetPreview';

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
      origin: { kind: 'manual' },
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
    series: { kind: 'manual' },
    ...overrides,
  };
}

function makeCommands(overrides: Partial<MovementDetailViewProps['provided']['commands']> = {}) {
  return {
    closeDetail: vi.fn(),
    dismissSheet: vi.fn(),
    toggleOverflow: vi.fn(),
    openCategorySheet: vi.fn(),
    openTagsSheet: vi.fn(),
    openSharingSheet: vi.fn(),
    openItemsSheet: vi.fn(),
    openMoreDetailsSheet: vi.fn(),
    setCategoryQuery: vi.fn(),
    setTagsQuery: vi.fn(),
    saveCategory: vi.fn(),
    toggleDraftTag: vi.fn(),
    saveTags: vi.fn(),
    setIgnored: vi.fn(),
    runOverflowAction: vi.fn(),
    stopFutureMovements: vi.fn(),
    postExpectedMovement: vi.fn(),
    ...overrides,
  };
}

function renderView(
  overrides: Partial<MovementDetailViewProps['required']> = {},
  commandOverrides: Partial<MovementDetailViewProps['provided']['commands']> = {},
) {
  const commands = makeCommands(commandOverrides);
  const required: MovementDetailViewProps['required'] = {
    state: {
      open: true,
      activeSheet: null,
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

  render(<MovementDetailView required={required} provided={{ commands }} />);
  return { commands, required };
}

function sheetAriaLabel(activeSheet: 'category' | 'tags' | 'sharing' | 'items' | 'more'): string {
  if (activeSheet === 'items') {
    return 'Movement items';
  }
  if (activeSheet === 'more') {
    return 'Movement more';
  }
  if (activeSheet === 'category') {
    return 'Movement category';
  }
  if (activeSheet === 'tags') {
    return 'Movement tags';
  }
  return 'Movement sharing';
}

describe('MovementDetailView', () => {
  it('renders the summary as a full-screen detail without SheetView when no sheet is active', () => {
    renderView();

    expect(screen.getByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
    expect(screen.queryByTestId('sheet-backdrop')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to movements' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close movement details/i })).not.toBeInTheDocument();
  });

  it('keeps the financial data and menu actions for posted, scheduled and expected', () => {
    const { rerender } = render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: true, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [], suggestedTags: [], overflowActions: [{ id: 'void-posted', label: 'Void movement', destructive: true }] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByText('-€15.00')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Void movement' })).toBeInTheDocument();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: true, categoryQuery: '', tagsQuery: '' },
          data: { movement: scheduledMovement(), categories: [], draftTags: [], suggestedTags: [], overflowActions: [{ id: 'stop-recurring-series', label: 'Stop future movements', destructive: true }] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('menuitem', { name: 'Stop future movements' })).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: true, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [], overflowActions: [{ id: 'edit-expected', label: 'Edit expected', destructive: false }] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('menuitem', { name: 'Edit expected' })).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });

  it('shows manual expected origin without scheduled details', () => {
    render(<MovementDetailsSheetPreview movement={expectedMovement()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'More details' }));

    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
    expect(screen.queryByText('Series')).not.toBeInTheDocument();
  });

  it('keeps category and tags visible for posted, scheduled and expected', () => {
    const { rerender } = render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'CategoryGroceries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TagsHomeTrip' })).toBeInTheDocument();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: scheduledMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'CategoryGroceries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TagsHome' })).toBeInTheDocument();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'CategoryGroceries' })).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
  });

  it('shows no category and no tags placeholders while keeping editable rows actionable', () => {
    const commands = makeCommands();

    render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: {
            movement: postedMovement({
              category: undefined,
              raw: {
                ...postedMovement().raw,
                categoryId: undefined,
                category: undefined,
                tags: [],
              },
              tags: [],
            }),
            categories: [],
            draftTags: [],
            suggestedTags: [],
          },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.getByRole('button', { name: 'CategoryNo category' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TagsNo tags' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CategoryNo category' }));
    fireEvent.click(screen.getByRole('button', { name: 'TagsNo tags' }));

    expect(commands.openCategorySheet).toHaveBeenCalledTimes(1);
    expect(commands.openTagsSheet).toHaveBeenCalledTimes(1);
  });

  it('keeps Post movement only for expected and places it outside the scrollable body', () => {
    const { rerender } = render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    const postButton = screen.getByRole('button', { name: 'Post movement' });
    expect(postButton.closest('footer')).not.toBeNull();
    expect(document.querySelector('.movement-detail-body')?.contains(postButton)).toBe(false);

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: null, overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: scheduledMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Post movement' })).not.toBeInTheDocument();
  });

  it.each([
    ['category', 'Category'],
    ['tags', 'Tags'],
    ['sharing', 'Sharing'],
    ['items', 'Items'],
    ['more', 'More details'],
  ] as const)('renders %s as a SheetView overlay', (activeSheet, title) => {
    renderView({
      state: {
        open: true,
        activeSheet,
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
      data: {
        movement: activeSheet === 'sharing'
          ? postedMovement({
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
          })
          : activeSheet === 'items'
            ? postedMovement({
              canOpenItems: true,
              items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }],
            })
            : postedMovement(),
        categories: [{ id: 'cat-1', name: 'Groceries' }],
        draftTags: [{ id: 'tag-1', name: 'Home' }],
        suggestedTags: [{ id: 'tag-2', name: 'Trip' }],
      },
    });

    expect(screen.getByTestId('sheet-backdrop')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: sheetAriaLabel(activeSheet) })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    const sheet = screen.getByRole('dialog', { name: sheetAriaLabel(activeSheet) });
    expect(within(sheet).queryByLabelText(/Back to movement/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('sheet-drag-handle')).toBeInTheDocument();
  });

  it('uses dismissSheet for backdrop close without closing the full-screen detail', () => {
    const first = renderView({
      state: {
        open: true,
        activeSheet: 'category',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    });

    fireEvent.click(screen.getByTestId('sheet-backdrop'));

    expect(first.commands.dismissSheet).toHaveBeenCalledTimes(1);
    expect(first.commands.closeDetail).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
  });

  it('saves category immediately and blocks closing while saving', () => {
    const first = renderView({
      state: {
        open: true,
        activeSheet: 'category',
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
    expect(first.commands.dismissSheet).not.toHaveBeenCalled();

    document.body.innerHTML = '';

    const second = renderView({
      state: {
        open: true,
        activeSheet: 'category',
        overflowOpen: false,
        categoryQuery: '',
        tagsQuery: '',
      },
    }, { saveCategory: first.commands.saveCategory });

    fireEvent.click(screen.getAllByRole('button', { name: 'No category' })[0]);
    expect(second.commands.saveCategory).toHaveBeenCalledWith(undefined);
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('renders tags Apply in the footer and uses draft-only interactions', () => {
    const { commands } = renderView({
      state: {
        open: true,
        activeSheet: 'tags',
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

    const applyButton = screen.getByRole('button', { name: 'Apply' });
    expect(applyButton.closest('.movement-detail-footer-content')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trip' }));
    expect(commands.toggleDraftTag).toHaveBeenCalledWith({ id: 'tag-2', name: 'Trip' });

    fireEvent.click(applyButton);
    expect(commands.saveTags).toHaveBeenCalledTimes(1);
  });

  it('disables Apply while tags are saving or unchanged', () => {
    const { rerender } = render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'tags', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [{ id: 'tag-1', name: 'Home' }], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'tags', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: postedMovement(), categories: [], draftTags: [{ id: 'tag-1', name: 'Home' }], suggestedTags: [] },
          status: { savingCategory: false, savingTags: true, tagsDirty: true, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('keeps sharing and items read-only and keeps more details interactive for ignored toggle', () => {
    const { rerender } = render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'sharing', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
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
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();

    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'items', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: {
            movement: postedMovement({
              canOpenItems: true,
              items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }],
            }),
            categories: [],
            draftTags: [],
            suggestedTags: [],
          },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.queryByRole('button', { name: /add item/i })).not.toBeInTheDocument();

    const commands = makeCommands();
    rerender(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'more', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: { movement: expectedMovement(), categories: [], draftTags: [], suggestedTags: [] },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Ignore in analytics' }));
    expect(commands.setIgnored).toHaveBeenCalledWith(false);
  });

  it('does not render a hyphen placeholder for account values in more details', () => {
    render(
      <MovementDetailView
        required={{
          state: { open: true, activeSheet: 'more', overflowOpen: false, categoryQuery: '', tagsQuery: '' },
          data: {
            movement: scheduledMovement({
              accountLabel: undefined,
              targetAccountLabel: undefined,
            }),
            categories: [],
            draftTags: [],
            suggestedTags: [],
          },
          status: { savingCategory: false, savingTags: false, tagsDirty: false, togglingIgnored: false, deactivating: false, pendingVoid: false },
        }}
        provided={{ commands: makeCommands() }}
      />,
    );

    expect(screen.queryByText('Source account')).not.toBeInTheDocument();
    expect(screen.queryByText('Target account')).not.toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('routes summary affordances to the right commands', () => {
    const { commands } = renderView({
      data: {
        movement: postedMovement({
          canOpenItems: true,
          items: [{ id: 'item-1', name: 'Milk', amount: '3.20', currency: 'EUR' }],
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
        categories: [{ id: 'cat-1', name: 'Groceries' }],
        draftTags: [{ id: 'tag-1', name: 'Home' }],
        suggestedTags: [{ id: 'tag-2', name: 'Trip' }],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to movements' }));
    fireEvent.click(screen.getByRole('button', { name: 'CategoryGroceries' }));
    fireEvent.click(screen.getByRole('button', { name: 'TagsHomeTrip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shared with 2 peopleYour share · €5.00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Items1 items · €15.00' }));
    fireEvent.click(screen.getByRole('button', { name: /More details/i }));

    expect(commands.closeDetail).toHaveBeenCalledTimes(1);
    expect(commands.openCategorySheet).toHaveBeenCalledTimes(1);
    expect(commands.openTagsSheet).toHaveBeenCalledTimes(1);
    expect(commands.openSharingSheet).toHaveBeenCalledTimes(1);
    expect(commands.openItemsSheet).toHaveBeenCalledTimes(1);
    expect(commands.openMoreDetailsSheet).toHaveBeenCalledTimes(1);
  });
});
