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
