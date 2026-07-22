import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import { useMovementDetailModel } from './useMovementDetailModel';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function postedTransaction(overrides: Partial<TransactionHistoryItemView> = {}): TransactionHistoryItemView {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    accountName: 'Main',
    occurredAt: '2026-07-12T13:42:00.000Z',
    description: 'Groceries',
    merchant: 'Market',
    amount: '15.00',
    currency: 'EUR',
    type: 'expense',
    status: 'posted',
    categoryId: 'cat-1',
    tags: [
      { id: 'tag-1', name: 'Home' },
      { id: 'tag-2', name: 'Trip' },
    ],
    items: [],
    ignored: false,
    ...overrides,
  };
}

function expectedMovement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    accountName: 'Main',
    type: 'expense' as const,
    amount: '15.00',
    currency: 'EUR',
    expectedAt: '2026-07-12T13:42:00.000Z',
    description: 'Groceries',
    merchant: 'Market',
    categoryId: 'cat-1',
    splitItems: [],
    status: 'pending' as const,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ignored: true,
    origin: { kind: 'manual' as const },
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  const ports = {
    analytics: {
      analyticsSetMovementIgnored: vi.fn(),
    },
    expected: {
      expectedCreateMovement: vi.fn(),
      expectedUpdateMovement: vi.fn(),
      expectedListMovements: vi.fn(),
      expectedResolveMovement: vi.fn(),
      expectedDismissMovement: vi.fn(),
    },
    scheduling: {
      schedulingCreateMovement: vi.fn(),
      schedulingUpdateMovement: vi.fn(),
      schedulingDeactivateMovement: vi.fn(),
      schedulingListMovements: vi.fn(),
      schedulingGetMovement: vi.fn().mockResolvedValue({
        found: true,
        item: {
          id: 'series-1',
          type: 'expense',
          sourceAccountId: 'account-1',
          amount: '15.00',
          currency: 'EUR',
          status: 'active',
          startAt: '2026-07-01T00:00:00.000Z',
          nextDueAt: '2026-08-01T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 1,
          splitItems: [],
          rule: { frequency: 'monthly', interval: 1 },
          recurrenceEnd: { kind: 'never' },
        },
      }),
      movementsGetOverview: vi.fn(),
      movementsListScheduled: vi.fn(),
    },
    sharing: {
      sharingListPeople: vi.fn(),
      sharingApplyShareToPostedTransaction: vi.fn(),
      sharingGetMovementDetails: vi.fn().mockResolvedValue(null),
      sharingListMovementDetails: vi.fn(),
    },
    taxonomy: {
      taxonomyListCategories: vi.fn(),
      taxonomyCreateCategory: vi.fn(),
      taxonomyRenameCategory: vi.fn(),
      taxonomyListTags: vi.fn(),
      taxonomyRenameTag: vi.fn(),
      orchestrationCategorizeTransaction: vi.fn(),
      orchestrationApplyTransactionTags: vi.fn(),
      orchestrationListTransactionTaxonomy: vi.fn(),
    },
  };

  return {
    ports,
    postedItems: [postedTransaction()],
    scheduledItems: [],
    expectedItems: [],
    categories: [{ id: 'cat-1', name: 'Groceries', appliesTo: 'expense' as const, usageCount: 1 }],
    tags: [
      { id: 'tag-1', name: 'Home' },
      { id: 'tag-2', name: 'Trip' },
      { id: 'tag-3', name: 'Family' },
    ],
    refreshMovements: vi.fn().mockResolvedValue(undefined),
    requestVoid: vi.fn(),
    pendingVoidTransactionId: undefined,
    clearError: vi.fn(),
    reportError: vi.fn(),
    clock: { now: () => new Date('2026-07-13T12:00:00.000Z') },
    confirm: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

describe('useMovementDetailModel', () => {
  it('resolves a recurring expected series by its origin id even when the monthly list is empty', async () => {
    const input = makeInput({
      postedItems: [],
      scheduledItems: [],
      expectedItems: [expectedMovement({
        id: 'expected-id',
        origin: { kind: 'recurring', occurrenceId: 'occurrence-id', recurringMovementId: 'series-id' },
      })],
    });
    input.ports.scheduling.schedulingGetMovement.mockResolvedValue({
      found: true,
      item: {
        id: 'series-id', type: 'expense', sourceAccountId: 'account-1', amount: '15.00', currency: 'EUR',
        status: 'active', startAt: '2026-07-01T00:00:00.000Z', nextDueAt: '2026-08-01T00:00:00.000Z', zoneId: 'UTC',
        generatedOccurrences: 1, splitItems: [], rule: { frequency: 'monthly', interval: 1 }, recurrenceEnd: { kind: 'never' },
      },
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => result.current.actions.openExpectedMovementDetail('expected-id'));
    expect(result.current.required.data.movement).toMatchObject({ source: 'expected' });
    expect(input.ports.scheduling.schedulingGetMovement).toHaveBeenCalledWith({ recurringMovementId: 'series-id' });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.required.data.movement).toMatchObject({
      id: 'expected-id', series: { kind: 'recurring', series: { id: 'series-id', canStopFutureMovements: true } },
    });
    expect(result.current.required.data.overflowActions).toEqual(expect.arrayContaining([
      { id: 'edit-expected', label: 'Edit expected', destructive: false },
      { id: 'stop-recurring-series', label: 'Stop future movements', destructive: true },
    ]));
  });

  it('emits expected post and edit actions before closing the detail', () => {
    const onPostExpectedMovement = vi.fn();
    const onEditExpectedMovement = vi.fn();
    const input = makeInput({
      postedItems: [],
      expectedItems: [expectedMovement()],
      onPostExpectedMovement,
      onEditExpectedMovement,
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => result.current.actions.openExpectedMovementDetail('expected-1'));
    act(() => result.current.provided.commands.postExpectedMovement());
    expect(onPostExpectedMovement).toHaveBeenCalledWith(expect.objectContaining({ id: 'expected-1' }), 'Groceries');
    expect(result.current.state.selection).toBeNull();

    act(() => result.current.actions.openExpectedMovementDetail('expected-1'));
    act(() => result.current.provided.commands.runOverflowAction());
    expect(onEditExpectedMovement).toHaveBeenCalledWith(expect.objectContaining({ id: 'expected-1' }), 'Groceries');
    expect(result.current.state.selection).toBeNull();
  });

  it('stops an expected movement series with the series id and closes after refresh', async () => {
    const refreshMovements = vi.fn().mockResolvedValue(undefined);
    const scheduling = {
      id: 'series-1',
      type: 'expense' as const,
      sourceAccountId: 'account-1',
      amount: '15.00',
      currency: 'EUR',
      status: 'active' as const,
      startAt: '2026-07-01T00:00:00.000Z',
      nextDueAt: '2026-08-01T00:00:00.000Z',
      zoneId: 'UTC',
      generatedOccurrences: 1,
      splitItems: [],
      rule: { frequency: 'monthly' as const, interval: 1 },
      recurrenceEnd: { kind: 'never' as const },
    };
    const input = makeInput({
      postedItems: [],
      expectedItems: [expectedMovement({
        origin: { kind: 'recurring', occurrenceId: 'occ-1', recurringMovementId: 'series-1' },
      })],
      scheduledItems: [scheduling],
      refreshMovements,
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => result.current.actions.openExpectedMovementDetail('expected-1'));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      result.current.provided.commands.runOverflowAction('stop-recurring-series');
    });

    expect(input.ports.scheduling.schedulingDeactivateMovement).toHaveBeenCalledWith({ recurringMovementId: 'series-1' });
    expect(input.ports.scheduling.schedulingDeactivateMovement).not.toHaveBeenCalledWith({ recurringMovementId: 'expected-1' });
    expect(refreshMovements).toHaveBeenCalledOnce();
    expect(result.current.state.selection).toBeNull();
  });

  it('does not call scheduling or refresh when stopping an expected series is canceled', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    const refreshMovements = vi.fn().mockResolvedValue(undefined);
    const input = makeInput({
      postedItems: [],
      expectedItems: [expectedMovement({
        origin: { kind: 'recurring', occurrenceId: 'occ-1', recurringMovementId: 'series-1' },
      })],
      scheduledItems: [{
        id: 'series-1',
        type: 'expense' as const,
        sourceAccountId: 'account-1',
        amount: '15.00',
        currency: 'EUR',
        status: 'active' as const,
        startAt: '2026-07-01T00:00:00.000Z',
        zoneId: 'UTC',
        generatedOccurrences: 1,
        splitItems: [],
        rule: { frequency: 'monthly' as const, interval: 1 },
        recurrenceEnd: { kind: 'never' as const },
      }],
      confirm,
      refreshMovements,
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => result.current.actions.openExpectedMovementDetail('expected-1'));
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      result.current.provided.commands.runOverflowAction('stop-recurring-series');
    });

    expect(confirm).toHaveBeenCalledWith('Stop future movements?\n\nNo more movements will be generated from this series.\nExisting expected and posted movements will not be deleted.');
    expect(input.ports.scheduling.schedulingDeactivateMovement).not.toHaveBeenCalled();
    expect(refreshMovements).not.toHaveBeenCalled();
    expect(result.current.state.selection).toEqual({ source: 'expected', id: 'expected-1' });
  });

  it.each([
    ['post', 'postExpectedMovement'],
    ['edit', 'runOverflowAction'],
  ])('reports a missing expected %s callback and keeps the detail open', (_label, action) => {
    const input = makeInput({ postedItems: [], expectedItems: [expectedMovement()] });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => result.current.actions.openExpectedMovementDetail('expected-1'));
    act(() => result.current.provided.commands[action as 'postExpectedMovement' | 'runOverflowAction']());

    expect(input.reportError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.state.selection).toEqual({ source: 'expected', id: 'expected-1' });
  });

  it('dismissSheet clears searches and restores the persisted draft tags', () => {
    const input = makeInput();
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.setCategoryQuery('gro');
      result.current.provided.commands.setTagsQuery('family');
      result.current.provided.commands.toggleDraftTag({ id: 'tag-3', name: 'Family' });
      result.current.provided.commands.dismissSheet();
    });

    expect(result.current.state.activeSheet).toBeNull();
    expect(result.current.required.state.categoryQuery).toBe('');
    expect(result.current.required.state.tagsQuery).toBe('');
    expect(result.current.required.data.draftTags).toEqual([
      { id: 'tag-1', name: 'Home' },
      { id: 'tag-2', name: 'Trip' },
    ]);
  });

  it('does not dismiss the tags subview while tags are saving', async () => {
    const save = deferred<void>();
    const input = makeInput();
    input.ports.taxonomy.orchestrationApplyTransactionTags.mockReturnValue(save.promise);
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.setTagsQuery('trip');
      void result.current.provided.commands.saveTags();
    });
    act(() => {
      result.current.provided.commands.dismissSheet();
    });

    expect(result.current.state.activeSheet).toBe('tags');
    expect(result.current.required.state.tagsQuery).toBe('trip');

    await act(async () => {
      save.resolve();
      await save.promise;
    });
  });

  it('keeps the tags editor open when the backend reports a tagging failure', async () => {
    const input = makeInput();
    input.ports.taxonomy.orchestrationApplyTransactionTags.mockResolvedValue({
      status: 'failed',
      errorCode: 'TAGGING_FAILED',
      errorMessage: 'Tags could not be saved',
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
    });
    act(() => {
      result.current.provided.commands.toggleDraftTag({ id: 'tag-3', name: 'Family' });
    });

    await act(async () => {
      await result.current.provided.commands.saveTags();
    });

    expect(input.reportError).toHaveBeenCalledWith(new Error('Tags could not be saved'));
    expect(input.refreshMovements).not.toHaveBeenCalled();
    expect(result.current.state.activeSheet).toBe('tags');
    expect(result.current.required.status.savingTags).toBe(false);
    expect(result.current.required.data.draftTags).toContainEqual({ id: 'tag-3', name: 'Family' });
  });

  it.each([
    ['assigned', { status: 'assigned' as const, tagIds: ['tag-1'] }],
    ['none', { status: 'none' as const, tagIds: [] }],
  ])('refreshes and closes the tags editor after a %s result', async (_status, response) => {
    const input = makeInput();
    input.ports.taxonomy.orchestrationApplyTransactionTags.mockResolvedValue(response);
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
    });

    await act(async () => {
      await result.current.provided.commands.saveTags();
    });

    expect(input.refreshMovements).toHaveBeenCalledTimes(1);
    expect(result.current.state.activeSheet).toBeNull();
    expect(input.reportError).not.toHaveBeenCalled();
  });

  it('does not dismiss the category subview while category is saving', async () => {
    const save = deferred<void>();
    const input = makeInput();
    input.ports.taxonomy.orchestrationCategorizeTransaction.mockReturnValue(save.promise);
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openCategorySheet();
      result.current.provided.commands.setCategoryQuery('gro');
      void result.current.provided.commands.saveCategory('cat-1');
    });
    act(() => {
      result.current.provided.commands.dismissSheet();
    });

    expect(result.current.state.activeSheet).toBe('category');
    expect(result.current.required.state.categoryQuery).toBe('gro');

    await act(async () => {
      save.resolve();
      await save.promise;
    });
  });

  it('keeps tagsDirty false when the persisted and draft tags only differ by order', () => {
    const input = makeInput();
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.toggleDraftTag({ id: 'tag-1', name: 'Home' });
      result.current.provided.commands.toggleDraftTag({ id: 'tag-1', name: 'Home' });
    });

    expect(result.current.required.status.tagsDirty).toBe(false);
  });

  it('normalizes new tag names before computing tagsDirty', () => {
    const input = makeInput({
      postedItems: [postedTransaction({ tags: [] })],
      tags: [],
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.toggleDraftTag({ name: '  Travel  ' });
    });
    expect(result.current.required.status.tagsDirty).toBe(true);

    act(() => {
      result.current.provided.commands.toggleDraftTag({ name: 'travel' });
    });
    expect(result.current.required.status.tagsDirty).toBe(false);
  });

  it('keeps tagsDirty false when the draft matches the persisted tags', () => {
    const input = makeInput();
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
    });

    expect(result.current.required.status.tagsDirty).toBe(false);
  });

  it('sets tagsDirty true when a tag is added or removed', () => {
    const input = makeInput();
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
    });
    act(() => {
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.toggleDraftTag({ id: 'tag-3', name: 'Family' });
    });
    expect(result.current.required.status.tagsDirty).toBe(true);

    act(() => {
      result.current.provided.commands.dismissSheet();
      result.current.provided.commands.openTagsSheet();
      result.current.provided.commands.toggleDraftTag({ id: 'tag-1', name: 'Home' });
    });
    expect(result.current.required.status.tagsDirty).toBe(true);
  });

  it('orders category suggestions by usage count, normalized name and id', () => {
    const input = makeInput({
      categories: [
        { id: 'cat-b', name: 'Beauty', appliesTo: 'expense' as const, usageCount: 0 },
        { id: 'cat-g', name: 'Groceries', appliesTo: 'expense' as const, usageCount: 4 },
        { id: 'cat-d-2', name: 'Dining', appliesTo: 'expense' as const, usageCount: 1 },
        { id: 'cat-d-1', name: 'dining', appliesTo: 'expense' as const, usageCount: 1 },
      ],
    });
    const { result } = renderHook(() => useMovementDetailModel(input));

    act(() => {
      result.current.actions.openPostedMovementDetail('tx-1');
      result.current.provided.commands.openCategorySheet();
    });

    expect(result.current.required.data.categories.map((category) => category.id)).toEqual([
      'cat-g',
      'cat-d-1',
      'cat-d-2',
      'cat-b',
    ]);
  });
});
