import { useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerTransactionListItem, TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import { useLedgerTransactions } from '../../ledger/application/useLedgerTransactions';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import { createTaxonomyGateway } from '../../taxonomy/infrastructure/taxonomyGateway';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';
import type { TransactionHistoryViewProvided, TransactionHistoryViewRequired } from '../ui/TransactionHistoryView';
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

const VOID_COMMIT_DELAY_MS = 5000;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
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
  const [taxonomyByTransactionId, setTaxonomyByTransactionId] = useState<Record<string, TaxonomyAssignment>>({});
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState('');
  const [voidMutationPhase, setVoidMutationPhase] = useState<'idle' | 'scheduled' | 'committing'>('idle');
  const pendingVoidTimerRef = useRef<number | null>(null);

  const ledgerGateway = useMemo(() => createLedgerGateway(core), [core]);
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
      const categoryId = taxonomy?.categoryId ?? transaction.categoryId;
      const tagIds = taxonomy?.tagIds ?? [];

      const category = categoryId
        ? {
            id: categoryId,
            name: categoryNameById.get(categoryId) ?? categoryId,
          }
        : undefined;

      const transactionTags = tagIds.map((tagId) => ({
        id: tagId,
        name: tagNameById.get(tagId) ?? tagId,
      }));

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
    () => mapTransactionHistoryList(historyExpanded ? transactionsWithTaxonomy : transactionsWithTaxonomy.slice(0, 3)),
    [historyExpanded, transactionsWithTaxonomy],
  );

  const hiddenTransactionsCount = Math.max(0, transactionsWithTaxonomy.length - historyItems.length);

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

    const hasCategoryIds = result.items.some((item) => Boolean(item.categoryId));
    const hasTagIds = result.items.some((item) => (item.tagIds?.length ?? 0) > 0);

    if (hasCategoryIds && categories.length === 0) {
      const taxonomy = await categorySuggestions.listCategories({ includeArchived: false });
      setCategories(taxonomy.items);
    }

    if (hasTagIds && tags.length === 0) {
      const taxonomyTags = await tagSuggestions.listTags({ includeArchived: false });
      setTags(taxonomyTags.items);
    }
  }

  async function refreshTransactions() {
    if (!accountId) {
      setTransactions([]);
      setTaxonomyByTransactionId({});
      return;
    }

    const transactionResult = await ledgerTransactions.listTransactions({
      accountId,
      limit: 20,
      includeVoided: true,
    });
    setTransactions(transactionResult.items);
    await refreshTaxonomyAssignments(transactionResult.items);
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      setLoading(false);
      setTransactions([]);
      setTaxonomyByTransactionId({});
      setError('');
      clearToastState();
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await refreshTransactions();
        if (!cancelled) {
          setHistoryExpanded(false);
        }
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
  }, [enabled, accountId, refreshSignal]);

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
      hiddenCount: hiddenTransactionsCount,
      expanded: historyExpanded,
      pendingVoidTransactionId: pendingVoidTransactionId || undefined,
    },
    status: {
      loading,
      mutating: voidMutationPhase !== 'idle',
      disabled,
    },
  };

  const provided: TransactionHistoryViewProvided = {
    commands: {
      expandHistory: () => setHistoryExpanded(true),
      requestVoid: requestVoidTransaction,
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
