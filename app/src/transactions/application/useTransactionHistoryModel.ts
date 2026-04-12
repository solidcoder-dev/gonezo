import { useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerTransactionListItem, SchedulingMovementItem, TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import { useLedgerTransactions } from '../../ledger/application/useLedgerTransactions';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { createSchedulingGateway } from '../../scheduling/infrastructure/schedulingGateway';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import { createTaxonomyGateway } from '../../taxonomy/infrastructure/taxonomyGateway';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';
import type {
  TransactionHistoryFiltersState,
  TransactionHistoryViewProvided,
  TransactionHistoryViewRequired,
} from '../ui/TransactionHistoryView.contract';
import { mapTransactionHistoryList } from './transactionViewMappers';
import type { TransactionsCorePort } from './transactionsCore.port';

type UseTransactionHistoryModelInput = {
  core: TransactionsCorePort;
  accountId: string | null;
  enabled: boolean;
  refreshSignal: boolean;
  onVoided?: (transactionId: string) => void;
  onError?: (error: { message: string }) => void;
};

type TaxonomyAssignment = {
  categoryId?: string;
  tagIds: string[];
  categorizationStatus?: string;
  taggingStatus?: string;
};

type TransactionFilterFormState = TransactionHistoryFiltersState;

type TransactionPaginationState = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

const VOID_COMMIT_DELAY_MS = 5000;

const DEFAULT_FILTERS: TransactionFilterFormState = {
  text: '',
  categoryIds: [],
  tagIds: [],
  amountMin: '',
  amountMax: '',
  fromDate: '',
  toDate: '',
  status: 'all',
  origin: 'all',
  sortField: 'occurredAt',
  sortDirection: 'desc',
  pageSize: 10,
};

const EMPTY_PAGINATION: TransactionPaginationState = {
  page: 0,
  size: DEFAULT_FILTERS.pageSize,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

function createDefaultFilters(): TransactionFilterFormState {
  return {
    ...DEFAULT_FILTERS,
    categoryIds: [],
    tagIds: [],
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function normalizeIdentifierList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeAmount(value: string): string | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric.toString();
}

function normalizeFromDate(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00.000Z`;
  }
  return normalized;
}

function normalizeToDate(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T23:59:59.999Z`;
  }
  return normalized;
}

function mergeFilterPatch(
  base: TransactionFilterFormState,
  patch: Partial<TransactionFilterFormState>,
): TransactionFilterFormState {
  const next: TransactionFilterFormState = {
    ...base,
    ...patch,
  };
  if (patch.categoryIds != null) {
    next.categoryIds = normalizeIdentifierList(patch.categoryIds);
  }
  if (patch.tagIds != null) {
    next.tagIds = normalizeIdentifierList(patch.tagIds);
  }
  if (patch.pageSize != null) {
    const parsedPageSize = Number(patch.pageSize);
    next.pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(Math.trunc(parsedPageSize), 100)
      : DEFAULT_FILTERS.pageSize;
  }
  return next;
}

export function useTransactionHistoryModel(input: UseTransactionHistoryModelInput) {
  const { core, accountId, enabled, refreshSignal, onVoided, onError } = input;

  const [loading, setLoading] = useState(true);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  const [transactions, setTransactions] = useState<LedgerTransactionListItem[]>([]);
  const [scheduledItems, setScheduledItems] = useState<SchedulingMovementItem[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledHasMore, setScheduledHasMore] = useState(false);
  const [taxonomyByTransactionId, setTaxonomyByTransactionId] = useState<Record<string, TaxonomyAssignment>>({});
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersAdvancedOpen, setFiltersAdvancedOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<TransactionFilterFormState>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilterFormState>(() => createDefaultFilters());
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState<TransactionPaginationState>(EMPTY_PAGINATION);

  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState('');
  const [pendingDeactivateScheduledId, setPendingDeactivateScheduledId] = useState('');
  const [voidMutationPhase, setVoidMutationPhase] = useState<'idle' | 'scheduled' | 'committing'>('idle');
  const pendingVoidTimerRef = useRef<number | null>(null);
  const previousAccountIdRef = useRef<string | null>(null);

  const ledgerGateway = useMemo(() => createLedgerGateway(core), [core]);
  const schedulingGateway = useMemo(() => createSchedulingGateway(core), [core]);
  const taxonomyGateway = useMemo(() => createTaxonomyGateway(core), [core]);

  const ledgerTransactions = useLedgerTransactions(ledgerGateway);
  const categorySuggestions = useCategorySuggestions(taxonomyGateway);
  const tagSuggestions = useTagSuggestions(taxonomyGateway);
  const transactionClassification = useTransactionClassification(taxonomyGateway);

  const categoryNameById = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const category of categories) {
      mapping.set(category.id, category.name);
    }
    return mapping;
  }, [categories]);

  const tagNameById = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const tag of tags) {
      mapping.set(tag.id, tag.name);
    }
    return mapping;
  }, [tags]);

  const transactionsWithTaxonomy = useMemo(
    () => transactions.map((transaction) => {
      const taxonomy = taxonomyByTransactionId[transaction.id];
      const categoryId = taxonomy?.categoryId ?? transaction.categoryId ?? transaction.category?.id;
      const categoryName = categoryId
        ? transaction.category?.name ?? categoryNameById.get(categoryId)
        : undefined;

      const category = categoryId && categoryName
        ? {
            id: categoryId,
            name: categoryName,
          }
        : undefined;

      const taxonomyTagIds = taxonomy?.tagIds ?? [];
      const fallbackTagMap = new Map(
        (transaction.tags ?? [])
          .map((tag) => [tag.id, tag.name] as const)
          .filter((entry) => entry[0].trim().length > 0 && entry[1].trim().length > 0),
      );
      const tagIds = taxonomyTagIds.length > 0
        ? taxonomyTagIds
        : (transaction.tags ?? []).map((tag) => tag.id);

      const transactionTags = tagIds
        .map((tagId) => {
          const name = tagNameById.get(tagId) ?? fallbackTagMap.get(tagId);
          if (!name || name.trim().length === 0) {
            return undefined;
          }
          return {
            id: tagId,
            name,
          };
        })
        .filter((tag): tag is { id: string; name: string } => tag != null);

      return {
        ...transaction,
        categoryId,
        category,
        tags: transactionTags,
        categorizationStatus: taxonomy?.categorizationStatus as LedgerTransactionListItem['categorizationStatus'],
        taggingStatus: taxonomy?.taggingStatus as LedgerTransactionListItem['taggingStatus'],
      };
    }),
    [categoryNameById, tagNameById, taxonomyByTransactionId, transactions],
  );

  const historyItems = useMemo<TransactionHistoryItemView[]>(
    () => mapTransactionHistoryList(transactionsWithTaxonomy),
    [transactionsWithTaxonomy],
  );

  function clearPendingVoidTimer() {
    if (pendingVoidTimerRef.current != null) {
      window.clearTimeout(pendingVoidTimerRef.current);
      pendingVoidTimerRef.current = null;
    }
  }

  function clearToastState() {
    setToastMessage('');
    setToastActionLabel('');
    setToastAction(null);
  }

  function showToast(message: string) {
    setToastMessage(message);
    setToastActionLabel('');
    setToastAction(null);
  }

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }

  function cancelPendingVoid(message: string) {
    clearPendingVoidTimer();
    setPendingVoidTransactionId('');
    setVoidMutationPhase('idle');
    setToastActionLabel('');
    setToastAction(null);
    setToastMessage(message);
  }

  async function refreshTaxonomyAssignments(items: LedgerTransactionListItem[]) {
    const transactionIds = [...new Set(items.map((item) => item.id).filter((id) => id.trim().length > 0))];
    if (transactionIds.length === 0) {
      setTaxonomyByTransactionId({});
      return;
    }

    const result = await transactionClassification.listTransactionTaxonomy({ transactionIds });
    const next: Record<string, TaxonomyAssignment> = {};
    for (const item of result.items) {
      next[item.transactionId] = {
        categoryId: item.categoryId,
        tagIds: [...(item.tagIds ?? [])],
        categorizationStatus: item.categorizationStatus,
        taggingStatus: item.taggingStatus,
      };
    }
    setTaxonomyByTransactionId(next);
  }

  async function ensureFilterOptionsLoaded() {
    const operations: Promise<void>[] = [];

    if (categories.length === 0) {
      operations.push(
        categorySuggestions
          .listCategories({ includeArchived: false })
          .then((result) => setCategories(result.items)),
      );
    }

    if (tags.length === 0) {
      operations.push(
        tagSuggestions
          .listTags({ includeArchived: false })
          .then((result) => setTags(result.items)),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }

  async function refreshTransactions() {
    if (!accountId) {
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setPendingDeactivateScheduledId('');
      setTaxonomyByTransactionId({});
      setPagination({ ...EMPTY_PAGINATION, size: appliedFilters.pageSize });
      return;
    }

    const normalizedCategoryIds = normalizeIdentifierList(appliedFilters.categoryIds);
    const normalizedTagIds = normalizeIdentifierList(appliedFilters.tagIds);
    let amountMin = normalizeAmount(appliedFilters.amountMin);
    let amountMax = normalizeAmount(appliedFilters.amountMax);
    if (amountMin != null && amountMax != null && Number(amountMin) > Number(amountMax)) {
      [amountMin, amountMax] = [amountMax, amountMin];
    }

    const overviewResult = await schedulingGateway.movementsGetOverview({
      accountId,
      filters: {
        text: appliedFilters.text.trim() || undefined,
        categoryIds: normalizedCategoryIds.length > 0 ? normalizedCategoryIds : undefined,
        categoryId: normalizedCategoryIds.length === 1 ? normalizedCategoryIds[0] : undefined,
        tagIds: normalizedTagIds.length > 0 ? normalizedTagIds : undefined,
        amountMin,
        amountMax,
        fromDate: normalizeFromDate(appliedFilters.fromDate),
        toDate: normalizeToDate(appliedFilters.toDate),
        status: appliedFilters.status,
        origin: appliedFilters.origin,
        types: undefined,
      },
      executedPagination: {
        page,
        size: appliedFilters.pageSize,
      },
      sort: [
        {
          field: appliedFilters.sortField,
          direction: appliedFilters.sortDirection,
        },
      ],
      scheduledPreviewSize: 5,
    });
    setTransactions(overviewResult.executedPage.content);
    setScheduledItems(overviewResult.scheduledPreview.items);
    setScheduledTotal(overviewResult.scheduledPreview.total);
    setScheduledHasMore(overviewResult.scheduledPreview.hasMore);
    setPagination({
      page: overviewResult.executedPage.page,
      size: overviewResult.executedPage.size,
      totalElements: overviewResult.executedPage.totalElements,
      totalPages: overviewResult.executedPage.totalPages,
      hasNext: overviewResult.executedPage.hasNext,
      hasPrevious: overviewResult.executedPage.hasPrevious,
    });
    if (page !== overviewResult.executedPage.page) {
      setPage(overviewResult.executedPage.page);
    }
    await refreshTaxonomyAssignments(overviewResult.executedPage.content);
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      previousAccountIdRef.current = accountId;
      setLoading(false);
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setTaxonomyByTransactionId({});
      setError('');
      clearToastState();
      setFiltersOpen(false);
      setFiltersAdvancedOpen(false);
      setFilterDraft(createDefaultFilters());
      setAppliedFilters(createDefaultFilters());
      setPage(0);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    const accountChanged = previousAccountIdRef.current !== accountId;
    if (accountChanged) {
      previousAccountIdRef.current = accountId;
      setError('');
      clearToastState();
      setFiltersOpen(false);
      setFiltersAdvancedOpen(false);
      setFilterDraft(createDefaultFilters());
      setAppliedFilters(createDefaultFilters());
      setPage(0);
      setPagination(EMPTY_PAGINATION);
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setPendingDeactivateScheduledId('');
      setTaxonomyByTransactionId({});
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await Promise.all([refreshTransactions(), ensureFilterOptionsLoaded()]);
      } catch (err) {
        if (!cancelled) {
          reportError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      clearPendingVoidTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accountId, refreshSignal, page, appliedFilters]);

  useEffect(() => () => {
    clearPendingVoidTimer();
  }, []);

  async function executeVoidTransaction(transactionId: string) {
    setPostingTransaction(true);
    setVoidMutationPhase('committing');
    try {
      await ledgerTransactions.voidTransaction({ transactionId });
      showToast('Transaction voided.');
      onVoided?.(transactionId);
      await refreshTransactions();
    } catch (err) {
      reportError(err);
    } finally {
      setPostingTransaction(false);
      setPendingVoidTransactionId('');
      setVoidMutationPhase('idle');
      setToastActionLabel('');
      setToastAction(null);
      clearPendingVoidTimer();
    }
  }

  async function deactivateScheduledMovement(scheduledMovementId: string) {
    setError('');
    setPendingDeactivateScheduledId(scheduledMovementId);
    try {
      await schedulingGateway.schedulingDeactivateMovement({
        recurringMovementId: scheduledMovementId,
      });
      await refreshTransactions();
      showToast('Scheduled movement deactivated.');
    } catch (err) {
      reportError(err);
    } finally {
      setPendingDeactivateScheduledId('');
    }
  }

  function requestVoidTransaction(transactionId: string) {
    setError('');
    clearPendingVoidTimer();
    setPendingVoidTransactionId(transactionId);
    setVoidMutationPhase('scheduled');
    setToastMessage('Transaction will be voided in 5 seconds.');
    setToastActionLabel('Undo');
    setToastAction(() => () => cancelPendingVoid('Void canceled.'));

    pendingVoidTimerRef.current = window.setTimeout(() => {
      pendingVoidTimerRef.current = null;
      void executeVoidTransaction(transactionId);
    }, VOID_COMMIT_DELAY_MS);
  }

  const disabled = postingTransaction || loading;

  const required: TransactionHistoryViewRequired = {
    state: {
      items: historyItems,
      scheduledItems,
      scheduledTotal,
      scheduledHasMore,
      filtersOpen,
      filtersAdvancedOpen,
      filters: {
        text: filterDraft.text,
        categoryIds: filterDraft.categoryIds,
        tagIds: filterDraft.tagIds,
        amountMin: filterDraft.amountMin,
        amountMax: filterDraft.amountMax,
        fromDate: filterDraft.fromDate,
        toDate: filterDraft.toDate,
        status: filterDraft.status,
        origin: filterDraft.origin,
        sortField: filterDraft.sortField,
        sortDirection: filterDraft.sortDirection,
        pageSize: filterDraft.pageSize,
      },
      appliedFilters: {
        text: appliedFilters.text,
        categoryIds: appliedFilters.categoryIds,
        tagIds: appliedFilters.tagIds,
        amountMin: appliedFilters.amountMin,
        amountMax: appliedFilters.amountMax,
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
        status: appliedFilters.status,
        origin: appliedFilters.origin,
        sortField: appliedFilters.sortField,
        sortDirection: appliedFilters.sortDirection,
        pageSize: appliedFilters.pageSize,
      },
      filterOptions: {
        categories: categories.map((category) => ({ id: category.id, label: category.name })),
        tags: tags.map((tag) => ({ id: tag.id, label: tag.name })),
      },
      pagination: {
        page: pagination.page,
        size: pagination.size,
        totalElements: pagination.totalElements,
        totalPages: pagination.totalPages,
        hasNext: pagination.hasNext,
        hasPrevious: pagination.hasPrevious,
      },
      pendingVoidTransactionId: pendingVoidTransactionId || undefined,
      pendingDeactivateScheduledId: pendingDeactivateScheduledId || undefined,
    },
    status: {
      loading,
      mutating: voidMutationPhase !== 'idle',
      disabled,
    },
  };

  const provided: TransactionHistoryViewProvided = {
    commands: {
      openFilters: () => {
        setFiltersOpen(true);
        setFiltersAdvancedOpen(false);
        void ensureFilterOptionsLoaded().catch(reportError);
      },
      closeFilters: () => {
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      toggleAdvancedFilters: () => {
        setFiltersAdvancedOpen((previous) => {
          const next = !previous;
          if (next) {
            void ensureFilterOptionsLoaded().catch(reportError);
          }
          return next;
        });
      },
      resetFilters: () => {
        setFilterDraft(createDefaultFilters());
        setAppliedFilters(createDefaultFilters());
        setPage(0);
        setFiltersAdvancedOpen(false);
      },
      setFilterText: (value) => setFilterDraft((previous) => ({ ...previous, text: value })),
      setFilterCategoryIds: (values) =>
        setFilterDraft((previous) => ({ ...previous, categoryIds: normalizeIdentifierList(values) })),
      setFilterTagIds: (values) =>
        setFilterDraft((previous) => ({ ...previous, tagIds: normalizeIdentifierList(values) })),
      setFilterAmountMin: (value) => setFilterDraft((previous) => ({ ...previous, amountMin: value })),
      setFilterAmountMax: (value) => setFilterDraft((previous) => ({ ...previous, amountMax: value })),
      setFilterFromDate: (value) => setFilterDraft((previous) => ({ ...previous, fromDate: value })),
      setFilterToDate: (value) => setFilterDraft((previous) => ({ ...previous, toDate: value })),
      setFilterStatus: (value) => setFilterDraft((previous) => ({ ...previous, status: value })),
      setFilterOrigin: (value) => setFilterDraft((previous) => ({ ...previous, origin: value })),
      setSortField: (value) => setFilterDraft((previous) => ({ ...previous, sortField: value })),
      setSortDirection: (value) => setFilterDraft((previous) => ({ ...previous, sortDirection: value })),
      setPageSize: (value) => {
        const normalized = Number.isFinite(value) && value > 0 ? Math.min(Math.trunc(value), 100) : DEFAULT_FILTERS.pageSize;
        setFilterDraft((previous) => ({ ...previous, pageSize: normalized }));
      },
      applyFilterPatch: (patch) => {
        const next = mergeFilterPatch(appliedFilters, patch);
        setFilterDraft(next);
        setAppliedFilters(next);
        setPage(0);
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      applyFilters: () => {
        setAppliedFilters(mergeFilterPatch(filterDraft, {}));
        setPage(0);
        setFiltersOpen(false);
        setFiltersAdvancedOpen(false);
      },
      goToPreviousPage: () => {
        setPage((previous) => Math.max(0, previous - 1));
      },
      goToNextPage: () => {
        if (!pagination.hasNext) {
          return;
        }
        setPage((previous) => previous + 1);
      },
      requestVoid: requestVoidTransaction,
      deactivateScheduledMovement,
      undoVoid: () => toastAction?.(),
    },
  };

  return {
    error,
    toast: {
      message: toastMessage,
      actionLabel: toastActionLabel,
      dismiss: () => {
        if (pendingVoidTransactionId) {
          cancelPendingVoid('Void canceled.');
        } else {
          clearToastState();
        }
      },
      runAction: () => toastAction?.(),
    },
    required,
    provided,
  };
}
