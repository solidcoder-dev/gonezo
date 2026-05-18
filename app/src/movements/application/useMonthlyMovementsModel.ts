import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerTransactionListItem, TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import { useLedgerTransactions } from '../../ledger/application/useLedgerTransactions';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { mapTransactionHistoryList } from '../../transactions/application/transactionViewMappers';
import type { ExpectedMovementView, ScheduledMovementView } from '../domain/movementsView.types';
import type { MonthlyMovementsViewProvided, MonthlyMovementsViewRequired } from '../ui/MonthlyMovementsView.contract';
import { filterProjectedScheduledMovements } from './monthlyMovementProjection';

export type MonthlyMovementsModelPorts = {
  ledger: LedgerGatewayPort;
  scheduling: SchedulingGatewayPort;
  expected: ExpectedGatewayPort;
  taxonomy: TaxonomyGatewayPort;
};

export type MonthlyMovementsModelClock = {
  now(): Date;
};

export type MonthlyMovementsModelTimers = {
  setTimeout(handler: () => void, timeoutMs: number): number;
  clearTimeout(timerId: number): void;
};

type UseMonthlyMovementsModelInput = {
  ports: MonthlyMovementsModelPorts;
  accountId: string | null;
  enabled: boolean;
  refreshSignal: boolean;
  clock: MonthlyMovementsModelClock;
  timers: MonthlyMovementsModelTimers;
  onVoided?: (transactionId: string) => void;
  onExpectedPosted?: () => void;
  onExpectedDismissed?: () => void;
  onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onEditScheduledMovement?: (movement: ScheduledMovementView, categoryName?: string) => void;
  onError?: (error: { message: string }) => void;
};

type TaxonomyAssignment = {
  categoryId?: string;
  tagIds: string[];
};

type PaginationState = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

const VOID_COMMIT_DELAY_MS = 5000;
const POSTED_PAGE_SIZE = 10;

const EMPTY_PAGINATION: PaginationState = {
  page: 0,
  size: POSTED_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function sameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function useMonthlyMovementsModel(input: UseMonthlyMovementsModelInput) {
  const {
    ports,
    accountId,
    enabled,
    refreshSignal,
    clock,
    timers,
    onVoided,
    onExpectedDismissed,
    onPostExpectedMovement,
    onEditExpectedMovement,
    onEditScheduledMovement,
    onError,
  } = input;

  const [loading, setLoading] = useState(true);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  const [monthCursor, setMonthCursor] = useState<Date>(() => monthStart(clock.now()));
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => clock.now().getFullYear());
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);

  const [transactions, setTransactions] = useState<LedgerTransactionListItem[]>([]);
  const [scheduledItems, setScheduledItems] = useState<MonthlyMovementsViewRequired['state']['scheduledItems']>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledHasMore, setScheduledHasMore] = useState(false);
  const [expectedItems, setExpectedItems] = useState<MonthlyMovementsViewRequired['state']['expectedItems']>([]);
  const [expectedTotal, setExpectedTotal] = useState(0);
  const [expectedHasMore, setExpectedHasMore] = useState(false);
  const [taxonomyByTransactionId, setTaxonomyByTransactionId] = useState<Record<string, TaxonomyAssignment>>({});
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState('');
  const [pendingDeactivateScheduledId, setPendingDeactivateScheduledId] = useState('');
  const [pendingDismissExpectedId, setPendingDismissExpectedId] = useState('');
  const [voidMutationPhase, setVoidMutationPhase] = useState<'idle' | 'scheduled' | 'committing'>('idle');

  const pendingVoidTimerRef = useRef<number | null>(null);
  const previousAccountIdRef = useRef<string | null>(null);

  const monthStartDate = useMemo(() => monthStart(monthCursor), [monthCursor]);
  const monthEndDate = useMemo(() => monthEnd(monthCursor), [monthCursor]);
  const currentMonth = useMemo(() => monthStart(clock.now()), [clock]);
  const isCurrentMonth = sameMonth(monthCursor, currentMonth);
  const viewedMonthIndex = monthCursor.getMonth();
  const viewedYear = monthCursor.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();

  const ledgerTransactions = useLedgerTransactions(ports.ledger);
  const categorySuggestions = useCategorySuggestions(ports.taxonomy);
  const tagSuggestions = useTagSuggestions(ports.taxonomy);
  const transactionClassification = useTransactionClassification(ports.taxonomy);

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
      };
    }),
    [categoryNameById, tagNameById, taxonomyByTransactionId, transactions],
  );

  const historyItems = useMemo(
    () => mapTransactionHistoryList(transactionsWithTaxonomy),
    [transactionsWithTaxonomy],
  );

  const clearPendingVoidTimer = useCallback(() => {
    if (pendingVoidTimerRef.current != null) {
      timers.clearTimeout(pendingVoidTimerRef.current);
      pendingVoidTimerRef.current = null;
    }
  }, [timers]);

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
      };
    }
    setTaxonomyByTransactionId(next);
  }

  async function ensureTaxonomyLoaded() {
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

  async function refreshMovements() {
    if (!accountId) {
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setExpectedItems([]);
      setExpectedTotal(0);
      setExpectedHasMore(false);
      setPagination(EMPTY_PAGINATION);
      setTaxonomyByTransactionId({});
      return;
    }

    const overview = await ports.scheduling.movementsGetOverview({
      accountId,
      filters: {
        fromDate: monthStartDate.toISOString(),
        toDate: monthEndDate.toISOString(),
      },
      executedPagination: {
        page,
        size: POSTED_PAGE_SIZE,
      },
      sort: [
        {
          field: 'occurredAt',
          direction: 'desc',
        },
      ],
      expectedPreviewSize: 30,
    });
    const visibleScheduledItems = filterProjectedScheduledMovements(
      overview.scheduledPreview.items,
      overview.expectedPreview.items,
    );

    setTransactions(overview.executedPage.content);
    setScheduledItems(visibleScheduledItems);
    setScheduledTotal(visibleScheduledItems.length);
    setScheduledHasMore(false);
    setExpectedItems(overview.expectedPreview.items);
    setExpectedTotal(overview.expectedPreview.total);
    setExpectedHasMore(overview.expectedPreview.hasMore);
    setPagination({
      page: overview.executedPage.page,
      size: overview.executedPage.size,
      totalElements: overview.executedPage.totalElements,
      totalPages: overview.executedPage.totalPages,
      hasNext: overview.executedPage.hasNext,
      hasPrevious: overview.executedPage.hasPrevious,
    });
    if (page !== overview.executedPage.page) {
      setPage(overview.executedPage.page);
    }
    await refreshTaxonomyAssignments(overview.executedPage.content);
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      previousAccountIdRef.current = accountId;
      clearPendingVoidTimer();
      setLoading(false);
      setError('');
      clearToastState();
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setExpectedItems([]);
      setExpectedTotal(0);
      setExpectedHasMore(false);
      setTaxonomyByTransactionId({});
      setPagination(EMPTY_PAGINATION);
      setPendingVoidTransactionId('');
      setPendingDeactivateScheduledId('');
      setPostingTransaction(false);
      setVoidMutationPhase('idle');
      setMonthMenuOpen(false);
      setMonthPickerOpen(false);
      setMonthPickerYear(monthCursor.getFullYear());
      return;
    }

    const accountChanged = previousAccountIdRef.current !== accountId;
    if (accountChanged) {
      previousAccountIdRef.current = accountId;
      clearPendingVoidTimer();
      setPage(0);
      setError('');
      clearToastState();
      setTransactions([]);
      setScheduledItems([]);
      setScheduledTotal(0);
      setScheduledHasMore(false);
      setExpectedItems([]);
      setExpectedTotal(0);
      setExpectedHasMore(false);
      setTaxonomyByTransactionId({});
      setPagination(EMPTY_PAGINATION);
      setPendingVoidTransactionId('');
      setPendingDeactivateScheduledId('');
      setPostingTransaction(false);
      setVoidMutationPhase('idle');
      setMonthMenuOpen(false);
      setMonthPickerOpen(false);
      setMonthPickerYear(monthCursor.getFullYear());
      setLoading(true);
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await Promise.all([refreshMovements(), ensureTaxonomyLoaded()]);
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
  }, [enabled, accountId, refreshSignal, page, monthStartDate.getTime(), monthEndDate.getTime()]);

  useEffect(() => () => {
    clearPendingVoidTimer();
  }, [clearPendingVoidTimer]);

  async function executeVoidTransaction(transactionId: string) {
    setPostingTransaction(true);
    setVoidMutationPhase('committing');
    setToastActionLabel('');
    setToastAction(null);
    try {
      await ledgerTransactions.voidTransaction({ transactionId });
      await refreshMovements();
      showToast('Transaction voided.');
      onVoided?.(transactionId);
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

  function requestVoid(transactionId: string) {
    setError('');
    clearPendingVoidTimer();
    setPendingVoidTransactionId(transactionId);
    setVoidMutationPhase('scheduled');
    setToastMessage('Transaction will be voided in 5 seconds.');
    setToastActionLabel('Undo');
    setToastAction(() => () => cancelPendingVoid('Void canceled.'));

    pendingVoidTimerRef.current = timers.setTimeout(() => {
      pendingVoidTimerRef.current = null;
      void executeVoidTransaction(transactionId);
    }, VOID_COMMIT_DELAY_MS);
  }

  async function deactivateScheduledMovement(scheduledMovementId: string) {
    setMutating(true);
    setPendingDeactivateScheduledId(scheduledMovementId);
    setError('');
    try {
      await ports.scheduling.schedulingDeactivateMovement({
        recurringMovementId: scheduledMovementId,
      });
      await refreshMovements();
      showToast('Scheduled movement deactivated.');
    } catch (err) {
      reportError(err);
    } finally {
      setMutating(false);
      setPendingDeactivateScheduledId('');
    }
  }

  async function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string): Promise<boolean> {
    if (!onPostExpectedMovement) {
      reportError(new Error('Posting expected movements is not available.'));
      return false;
    }

    onPostExpectedMovement(movement, categoryName);
    return true;
  }

  async function dismissExpectedMovement(movement: ExpectedMovementView): Promise<boolean> {
    setMutating(true);
    setPendingDismissExpectedId(movement.id);
    setError('');
    try {
      await ports.expected.expectedDismissMovement({
        expectedMovementId: movement.id,
        dismissedAt: clock.now().toISOString(),
      });
      await refreshMovements();
      onExpectedDismissed?.();
      showToast('Expected movement dismissed.');
      return true;
    } catch (err) {
      reportError(err);
      return false;
    } finally {
      setMutating(false);
      setPendingDismissExpectedId('');
    }
  }

  const disabled = loading || mutating || postingTransaction || voidMutationPhase === 'committing';

  const required: MonthlyMovementsViewRequired = {
    state: {
      accountId: accountId ?? '',
      monthLabel: monthLabel(monthCursor),
      isCurrentMonth,
      monthMenuOpen,
      monthPickerOpen,
      monthPickerYear,
      viewedMonthIndex,
      viewedYear,
      currentMonthIndex,
      currentYear,
      items: historyItems,
      scheduledItems,
      scheduledTotal,
      scheduledHasMore,
      expectedItems,
      expectedTotal,
      expectedHasMore,
      filterOptions: {
        categories: categories.map((category) => ({ id: category.id, label: category.name })),
        tags: tags.map((tag) => ({ id: tag.id, label: tag.name })),
      },
      pagination,
      pendingVoidTransactionId: pendingVoidTransactionId || undefined,
      pendingDeactivateScheduledId: pendingDeactivateScheduledId || undefined,
      pendingDismissExpectedId: pendingDismissExpectedId || undefined,
    },
    status: {
      loading,
      disabled,
    },
  };

  const provided: MonthlyMovementsViewProvided = {
    commands: {
      goToPreviousMonth: () => {
        setMonthCursor((previous) => monthStart(new Date(previous.getFullYear(), previous.getMonth() - 1, 1)));
        setMonthMenuOpen(false);
        setMonthPickerOpen(false);
        setPage(0);
      },
      goToCurrentMonth: () => {
        const target = monthStart(clock.now());
        setMonthCursor(target);
        setMonthPickerYear(target.getFullYear());
        setMonthMenuOpen(false);
        setMonthPickerOpen(false);
        setPage(0);
      },
      goToNextMonth: () => {
        setMonthCursor((previous) => monthStart(new Date(previous.getFullYear(), previous.getMonth() + 1, 1)));
        setMonthMenuOpen(false);
        setMonthPickerOpen(false);
        setPage(0);
      },
      toggleMonthMenu: () => {
        setMonthPickerOpen(false);
        setMonthMenuOpen((previous) => !previous);
      },
      closeMonthMenu: () => {
        setMonthMenuOpen(false);
      },
      openMonthPicker: () => {
        setMonthMenuOpen(false);
        setMonthPickerYear(monthCursor.getFullYear());
        setMonthPickerOpen(true);
      },
      closeMonthPicker: () => {
        setMonthPickerOpen(false);
      },
      goToPreviousPickerYear: () => {
        setMonthPickerYear((previous) => previous - 1);
      },
      goToNextPickerYear: () => {
        setMonthPickerYear((previous) => previous + 1);
      },
      selectPickerMonth: (monthIndex) => {
        setMonthCursor(monthStart(new Date(monthPickerYear, monthIndex, 1)));
        setMonthMenuOpen(false);
        setMonthPickerOpen(false);
        setPage(0);
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
      requestVoid,
      deactivateScheduledMovement,
      editScheduledMovement: (movement, categoryName) => onEditScheduledMovement?.(movement, categoryName),
      postExpectedMovement,
      dismissExpectedMovement,
      editExpectedMovement: (movement, categoryName) => onEditExpectedMovement?.(movement, categoryName),
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
