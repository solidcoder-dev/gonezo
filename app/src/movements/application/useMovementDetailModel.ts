import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { SharingGatewayPort } from '../../sharing/application/sharingGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { compareTaxonomyCategoriesByUsage } from '../../taxonomy/domain/categoryOrdering';
import {
  normalizeTaxonomyName,
} from '../../transactions/application/transactionTaxonomySelection';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import { mapMovementDetailViewModel } from './movementDetailMappers';
import {
  buildExpectedCategoryUpdateInput,
  buildExpectedIgnoredUpdateInput,
  buildScheduledCategoryUpdateInput,
  buildScheduledTagsUpdateInput,
} from './movementDetailPayloads';
import type {
  MovementDetailCategoryOption,
  MovementDetailSheet,
  MovementDetailSelection,
  MovementDetailTagOption,
  MovementDetailTagView,
  SharingDetailState,
  SharingViewModel,
} from './movementDetailView.types';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';

type MovementDetailModelInput = {
  ports: {
    analytics: Pick<AnalyticsPort, 'analyticsSetMovementIgnored'>;
    expected: ExpectedGatewayPort;
    scheduling: SchedulingGatewayPort;
    sharing: SharingGatewayPort;
    taxonomy: TaxonomyGatewayPort;
  };
  postedItems: TransactionHistoryItemView[];
  scheduledItems: ScheduledMovementView[];
  expectedItems: ExpectedMovementView[];
  categories: MovementDetailCategoryOption[];
  tags: MovementDetailTagOption[];
  refreshMovements(): Promise<void>;
  requestVoid(transactionId: string): void;
  pendingVoidTransactionId?: string;
  clearError(): void;
  reportError(raw: unknown): void;
  clock: {
    now(): Date;
  };
  confirm(message: string): boolean;
  onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
};

function defaultSharingState(): SharingDetailState {
  return { phase: 'idle' };
}

function tagSelectionKey(tags: MovementDetailTagView[]): string {
  return tags
    .map((tag) => tag.id ?? normalizeTaxonomyName(tag.name))
    .filter((value) => value.length > 0)
    .sort()
    .join('|');
}

function sharingParticipantStatus(
  value: 'not_expected' | 'pending' | 'paid' | 'dismissed' | 'missing_expected',
): SharingViewModel['participants'][number]['reimbursementStatus'] {
  if (value === 'pending' || value === 'paid' || value === 'dismissed') {
    return value;
  }
  return undefined;
}

function sharingViewModel(
  input: NonNullable<Awaited<ReturnType<SharingGatewayPort['sharingGetMovementDetails']>>>,
  currency: string,
): SharingViewModel {
  return {
    participantCount: input.participants.length,
    personalExpenseAmount: input.analytics.personalExpenseAmount,
    totalAmount: input.participants.reduce((sum, participant) => {
      const current = Number(sum);
      const next = Number(participant.amount);
      if (Number.isNaN(current) || Number.isNaN(next)) {
        return sum;
      }
      return (current + next).toFixed(2);
    }, '0.00'),
    currency,
    participants: input.participants.map((participant) => ({
      id: participant.participantId,
      name: participant.displayName,
      amount: participant.amount,
      reimbursementStatus: sharingParticipantStatus(participant.repaymentStatus),
    })),
  };
}

export function useMovementDetailModel(input: MovementDetailModelInput) {
  const {
    ports,
    postedItems,
    scheduledItems,
    expectedItems,
    categories,
    tags,
    refreshMovements,
    requestVoid,
    pendingVoidTransactionId,
    clearError,
    reportError,
    clock,
    confirm,
    onEditExpectedMovement,
    onPostExpectedMovement,
  } = input;

  const [selection, setSelection] = useState<MovementDetailSelection | null>(null);
  const [activeSheet, setActiveSheet] = useState<MovementDetailSheet | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [sharing, setSharing] = useState<SharingDetailState>(defaultSharingState);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [tagsQuery, setTagsQuery] = useState('');
  const [draftTags, setDraftTags] = useState<MovementDetailTagView[]>([]);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [togglingIgnored, setTogglingIgnored] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const movement = useMemo(
    () => mapMovementDetailViewModel({
      selection,
      postedItems,
      scheduledItems,
      expectedItems,
      categories,
      tags,
      sharing,
    }),
    [selection, postedItems, scheduledItems, expectedItems, categories, tags, sharing],
  );
  const selectedPostedMovement = useMemo(
    () => selection?.source === 'posted'
      ? postedItems.find((item) => item.id === selection.id) ?? null
      : null,
    [postedItems, selection],
  );

  useEffect(() => {
    if (!selection) {
      setActiveSheet(null);
      setOverflowOpen(false);
      setCategoryQuery('');
      setTagsQuery('');
      return;
    }
    if (!movement) {
      setSelection(null);
    }
  }, [movement, selection]);

  useEffect(() => {
    if (!selectedPostedMovement || selectedPostedMovement.type !== 'expense') {
      setSharing((previous) => (previous.phase === 'idle' ? previous : defaultSharingState()));
      return;
    }

    let cancelled = false;
    setSharing({ phase: 'loading' });

    void ports.sharing.sharingGetMovementDetails({ transactionId: selectedPostedMovement.id })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSharing({
          phase: 'loaded',
          value: result ? sharingViewModel(result, selectedPostedMovement.currency) : null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setSharing({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Sharing unavailable',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ports.sharing, selectedPostedMovement]);

  const filteredCategories = useMemo(() => {
    if (!movement || movement.financialType === 'transfer') {
      return [];
    }
    const normalizedQuery = normalizeTaxonomyName(categoryQuery);
    return categories
      .filter((item) => item.appliesTo === movement.financialType)
      .filter((item) => normalizedQuery.length === 0 || normalizeTaxonomyName(item.name).includes(normalizedQuery))
      .sort(compareTaxonomyCategoriesByUsage);
  }, [categories, categoryQuery, movement]);

  const filteredSuggestedTags = useMemo(() => {
    if (!movement || movement.source === 'expected') {
      return [];
    }
    const selectedNames = new Set(draftTags.map((tag) => normalizeTaxonomyName(tag.name)));
    const normalizedQuery = normalizeTaxonomyName(tagsQuery);
    return tags
      .filter((tag) => !selectedNames.has(normalizeTaxonomyName(tag.name)))
      .filter((tag) => normalizedQuery.length === 0 || normalizeTaxonomyName(tag.name).includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [draftTags, movement, tags, tagsQuery]);

  const tagsDirty = useMemo(() => {
    if (!movement || movement.source === 'expected') {
      return false;
    }
    return tagSelectionKey(draftTags) !== tagSelectionKey(movement.tags);
  }, [draftTags, movement]);

  function closeDetail() {
    setSelection(null);
    setActiveSheet(null);
    setOverflowOpen(false);
    setCategoryQuery('');
    setTagsQuery('');
    setDraftTags([]);
    setSharing(defaultSharingState());
  }

  function dismissSheet() {
    if (savingCategory || savingTags) {
      return;
    }
    setActiveSheet(null);
    setCategoryQuery('');
    setTagsQuery('');
    if (movement && movement.source !== 'expected') {
      setDraftTags(movement.tags);
      return;
    }
    setDraftTags([]);
  }

  function openSelection(nextSelection: MovementDetailSelection) {
    setSelection(nextSelection);
    setActiveSheet(null);
    setOverflowOpen(false);
    setCategoryQuery('');
    setTagsQuery('');
    setDraftTags([]);
    setSharing(defaultSharingState());
  }

  function openPostedMovementDetail(id: string) {
    openSelection({ source: 'posted', id });
  }

  function openScheduledMovementDetail(id: string) {
    openSelection({ source: 'scheduled', id });
  }

  function openExpectedMovementDetail(id: string) {
    openSelection({ source: 'expected', id });
  }

  function openCategorySheet() {
    if (!movement || !movement.canEditCategory) {
      return;
    }
    setCategoryQuery('');
    setActiveSheet('category');
  }

  function openTagsSheet() {
    if (!movement || movement.source === 'expected') {
      return;
    }
    setDraftTags(movement.tags);
    setTagsQuery('');
    setActiveSheet('tags');
  }

  function openSharingSheet() {
    if (movement?.source !== 'posted') {
      return;
    }
    if (movement.sharing.phase === 'loaded' && movement.sharing.value == null) {
      return;
    }
    setActiveSheet('sharing');
  }

  function openItemsSheet() {
    if (!movement?.canOpenItems) {
      return;
    }
    setActiveSheet('items');
  }

  function openMoreDetailsSheet() {
    if (!movement) {
      return;
    }
    setActiveSheet('more');
  }

  async function saveCategory(categoryId?: string) {
    if (!movement || !movement.canEditCategory) {
      return;
    }
    clearError();
    setSavingCategory(true);
    try {
      if (movement.source === 'posted') {
        await ports.taxonomy.orchestrationCategorizeTransaction({
          transactionId: movement.id,
          transactionType: movement.financialType === 'income' ? 'income' : 'expense',
          categoryId,
        });
      } else if (movement.source === 'scheduled') {
        await ports.scheduling.schedulingUpdateMovement(
          buildScheduledCategoryUpdateInput(movement.raw, categoryId),
        );
      } else {
        await ports.expected.expectedUpdateMovement(
          buildExpectedCategoryUpdateInput(movement.raw, categoryId),
        );
      }
      await refreshMovements();
      setActiveSheet(null);
    } catch (error) {
      reportError(error);
    } finally {
      setSavingCategory(false);
    }
  }

  function toggleDraftTag(tag: MovementDetailTagView) {
    setDraftTags((previous) => {
      const normalized = normalizeTaxonomyName(tag.name);
      const exists = previous.some((item) => normalizeTaxonomyName(item.name) === normalized);
      if (exists) {
        return previous.filter((item) => normalizeTaxonomyName(item.name) !== normalized);
      }
      return [...previous, tag];
    });
  }

  async function saveTags() {
    if (!movement || movement.source === 'expected') {
      return;
    }
    clearError();
    setSavingTags(true);
    try {
      if (movement.source === 'posted') {
        const result = await ports.taxonomy.orchestrationApplyTransactionTags({
          transactionId: movement.id,
          tagNames: draftTags.map((tag) => tag.name.trim()).filter((name) => name.length > 0),
        });
        if (result.status === 'failed') {
          throw new Error(result.errorMessage ?? 'Tags could not be saved');
        }
      } else {
        await ports.scheduling.schedulingUpdateMovement(
          buildScheduledTagsUpdateInput(movement.raw, draftTags, tags.map((tag) => ({ ...tag, status: 'active' }))),
        );
      }
      await refreshMovements();
      setActiveSheet(null);
    } catch (error) {
      reportError(error);
    } finally {
      setSavingTags(false);
    }
  }

  async function setIgnored(value: boolean) {
    if (!movement) {
      return;
    }
    clearError();
    setTogglingIgnored(true);
    try {
      if (movement.source === 'posted' && movement.canToggleIgnored) {
        await ports.analytics.analyticsSetMovementIgnored({
          movementId: movement.id,
          ignored: value,
          changedAt: clock.now().toISOString(),
        });
      }
      if (movement.source === 'expected' && movement.canToggleIgnored) {
        await ports.expected.expectedUpdateMovement(
          buildExpectedIgnoredUpdateInput(movement.raw, value),
        );
      }
      await refreshMovements();
    } catch (error) {
      reportError(error);
    } finally {
      setTogglingIgnored(false);
    }
  }

  function runOverflowAction() {
    if (!movement) {
      return;
    }
    setOverflowOpen(false);
    if (movement.source === 'posted' && movement.canVoid) {
      requestVoid(movement.id);
      return;
    }
    if (movement.source === 'scheduled' && movement.canDeactivate) {
      void deactivateScheduledMovement();
      return;
    }
    if (movement.source === 'expected' && movement.canEditExpected) {
      onEditExpectedMovement?.(movement.raw, movement.category?.name);
      closeDetail();
    }
  }

  async function deactivateScheduledMovement() {
    if (!movement || movement.source !== 'scheduled' || !movement.canDeactivate) {
      return;
    }
    const confirmed = confirm(
      'Deactivate movement?\n\nFuture occurrences will no longer be created.\nPreviously posted movements will not be affected.',
    );
    if (!confirmed) {
      return;
    }
    clearError();
    setDeactivating(true);
    try {
      await ports.scheduling.schedulingDeactivateMovement({
        recurringMovementId: movement.id,
      });
      await refreshMovements();
      closeDetail();
    } catch (error) {
      reportError(error);
    } finally {
      setDeactivating(false);
    }
  }

  function postExpectedMovement() {
    if (!movement || movement.source !== 'expected' || !movement.canPostExpected) {
      return;
    }
    onPostExpectedMovement?.(movement.raw, movement.category?.name);
    closeDetail();
  }

  const overflowActionLabel = movement?.source === 'posted' && movement.canVoid
    ? 'Void movement'
    : movement?.source === 'scheduled' && movement.canDeactivate
      ? 'Deactivate movement'
      : movement?.source === 'expected' && movement.canEditExpected
        ? 'Edit expected'
        : undefined;

  return {
    state: {
      selection,
      activeSheet,
    },
    required: {
      state: {
        open: movement != null,
        activeSheet,
        overflowOpen,
        categoryQuery,
        tagsQuery,
      },
      data: {
        movement,
        categories: filteredCategories,
        draftTags,
        suggestedTags: filteredSuggestedTags,
        overflowActionLabel,
      },
      status: {
        savingCategory,
        savingTags,
        tagsDirty,
        togglingIgnored,
        deactivating,
        pendingVoid: movement?.source === 'posted' && pendingVoidTransactionId === movement.id,
      },
    },
    provided: {
      commands: {
        closeDetail,
        dismissSheet,
        toggleOverflow: () => setOverflowOpen((previous) => !previous),
        openCategorySheet,
        openTagsSheet,
        openSharingSheet,
        openItemsSheet,
        openMoreDetailsSheet,
        setCategoryQuery,
        setTagsQuery,
        saveCategory,
        toggleDraftTag: (tag: MovementDetailTagView) => toggleDraftTag(tag),
        saveTags,
        setIgnored,
        runOverflowAction,
        deactivateScheduledMovement,
        postExpectedMovement,
      },
    },
    actions: {
      openPostedMovementDetail,
      openScheduledMovementDetail,
      openExpectedMovementDetail,
    },
  };
}
