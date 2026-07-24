import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { SharingGatewayPort } from '../../sharing/application/sharingGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { compareTaxonomyCategoriesByUsage } from '../../taxonomy/domain/categoryOrdering';
import {
  normalizeTaxonomyName,
} from '../../transactions/application/transactionTaxonomySelection';
import type { MovementsDetailData, MovementDetailQueryPort } from './movements.port';
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
  MovementDetailOverflowAction,
} from './movementDetailView.types';
import type { ExpectedMovementView } from './movementsView.types';

type MovementDetailModelInput = {
  ports: {
    movements: MovementDetailQueryPort;
    analytics: Pick<AnalyticsPort, 'analyticsSetMovementIgnored'>;
    expected: ExpectedGatewayPort;
    scheduling: SchedulingGatewayPort;
    sharing: SharingGatewayPort;
    taxonomy: TaxonomyGatewayPort;
  };
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
  const [detail, setDetail] = useState<MovementsDetailData | null>(null);
  const [detailLoadState, setDetailLoadState] = useState<
    | { phase: 'idle' }
    | { phase: 'loading'; selection: MovementDetailSelection }
    | { phase: 'loaded'; selection: MovementDetailSelection; detail: MovementsDetailData }
    | { phase: 'error'; selection: MovementDetailSelection; message: string }
  >({ phase: 'idle' });
  const [detailRefreshVersion, setDetailRefreshVersion] = useState(0);
  const detailRequestId = useRef(0);
  const movementsGetDetail = ports.movements.movementsGetDetail;
  const sharingGetMovementDetails = ports.sharing.sharingGetMovementDetails;
  const selectedSource = selection?.source;
  const selectedMovementId = selection?.id;

  const movement = useMemo(
    () => mapMovementDetailViewModel({
      detail,
      categories,
      tags,
      sharing,
    }),
    [detail, categories, tags, sharing],
  );
  const selectedPostedMovement = useMemo(
    () => movement?.source === 'posted'
      ? movement.raw
      : null,
    [movement],
  );

  useEffect(() => {
    if (!selection) {
      setActiveSheet(null);
      setOverflowOpen(false);
      setCategoryQuery('');
      setTagsQuery('');
      return;
    }
    if (!movement && detailLoadState.phase !== 'loading') setDetail(null);
  }, [detailLoadState.phase, movement, selection]);

  useEffect(() => {
    if (!selectedSource || !selectedMovementId) {
      setDetail(null);
      setDetailLoadState((previous) => (
        previous.phase === 'idle' ? previous : { phase: 'idle' }
      ));
      detailRequestId.current += 1;
      return;
    }
    const selectedDetail = { source: selectedSource, id: selectedMovementId };
    const requestId = ++detailRequestId.current;
    setDetail(null);
    setDetailLoadState({ phase: 'loading', selection: selectedDetail });
    void movementsGetDetail({ source: selectedSource, movementId: selectedMovementId })
      .then((result) => {
        if (requestId !== detailRequestId.current) return;
        if (!result.found) {
          setDetailLoadState({ phase: 'error', selection: selectedDetail, message: 'Movement is no longer available' });
          setSelection(null);
          return;
        }
        setDetail(result.detail);
        setDetailLoadState({ phase: 'loaded', selection: selectedDetail, detail: result.detail });
      })
      .catch((error: unknown) => {
        if (requestId !== detailRequestId.current) return;
        setDetail(null);
        const message = error instanceof Error ? error.message : 'Movement detail unavailable';
        setDetailLoadState({ phase: 'error', selection: selectedDetail, message });
        reportError(error);
      });
    return () => { detailRequestId.current += 1; };
  }, [detailRefreshVersion, movementsGetDetail, reportError, selectedMovementId, selectedSource]);

  useEffect(() => {
    if (!selectedPostedMovement || selectedPostedMovement.type !== 'expense') {
      setSharing((previous) => (previous.phase === 'idle' ? previous : defaultSharingState()));
      return;
    }

    let cancelled = false;
    setSharing({ phase: 'loading' });

    void sharingGetMovementDetails({ transactionId: selectedPostedMovement.id })
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
  }, [selectedPostedMovement, sharingGetMovementDetails]);

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
    setDetail(null);
    setDetailLoadState({ phase: 'idle' });
    detailRequestId.current += 1;
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
    setDetail(null);
    setDetailLoadState({ phase: 'idle' });
    detailRequestId.current += 1;
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
      setDetailRefreshVersion((version) => version + 1);
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
      setDetailRefreshVersion((version) => version + 1);
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
      setDetailRefreshVersion((version) => version + 1);
    } catch (error) {
      reportError(error);
    } finally {
      setTogglingIgnored(false);
    }
  }

  function runOverflowAction(actionId?: MovementDetailOverflowAction['id']) {
    if (!movement) return;
    const selectedActionId = actionId ?? overflowActions[0]?.id;
    if (!selectedActionId) return;
    setOverflowOpen(false);
    if (selectedActionId === 'void-posted' && movement.source === 'posted' && movement.canVoid) {
      requestVoid(movement.id);
      return;
    }
    if (selectedActionId === 'stop-recurring-series') {
      const recurringMovementId = movement.source === 'scheduled' && movement.canDeactivate
        ? movement.id
        : movement.source === 'expected' && movement.series.kind === 'recurring'
          && movement.series.series?.canStopFutureMovements
          ? movement.series.series.id
          : undefined;
      if (recurringMovementId) void stopFutureMovements(recurringMovementId);
      return;
    }
    if (selectedActionId === 'edit-expected' && movement.source === 'expected' && movement.canEditExpected) {
      if (!onEditExpectedMovement) {
        reportError(new Error('Expected movement edit action is not available'));
        return;
      }
      onEditExpectedMovement(movement.raw, movement.category?.name);
      closeDetail();
    }
  }

  async function stopFutureMovements(recurringMovementId: string) {
    const confirmed = confirm(
      'Stop future movements?\n\nNo more movements will be generated from this series.\nExisting expected and posted movements will not be deleted.',
    );
    if (!confirmed) {
      return;
    }
    clearError();
    setDeactivating(true);
    try {
      await ports.scheduling.schedulingDeactivateMovement({
        recurringMovementId,
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
    if (!onPostExpectedMovement) {
      reportError(new Error('Expected movement post action is not available'));
      return;
    }
    onPostExpectedMovement(movement.raw, movement.category?.name);
    closeDetail();
  }

  const overflowActions: MovementDetailOverflowAction[] = [];
  if (movement?.source === 'posted' && movement.canVoid) {
    overflowActions.push({ id: 'void-posted', label: 'Void movement', destructive: true });
  }
  if (movement?.source === 'scheduled' && movement.canDeactivate) {
    overflowActions.push({ id: 'stop-recurring-series', label: 'Stop future movements', destructive: true });
  }
  if (movement?.source === 'expected' && movement.canEditExpected) {
    overflowActions.push({ id: 'edit-expected', label: 'Edit expected', destructive: false });
  }
  if (movement?.source === 'expected' && movement.series.kind === 'recurring' && movement.series.series?.canStopFutureMovements) {
    overflowActions.push({ id: 'stop-recurring-series', label: 'Stop future movements', destructive: true });
  }

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
        overflowActions,
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
        stopFutureMovements,
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
