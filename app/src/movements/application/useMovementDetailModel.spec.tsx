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
    categories: [{ id: 'cat-1', name: 'Groceries', appliesTo: 'expense' as const }],
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
});
