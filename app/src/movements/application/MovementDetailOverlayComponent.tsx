import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import { MovementDetailView } from '../ui/MovementDetail/MovementDetailView';
import { useMovementDetailModel } from './useMovementDetailModel';
import type {
  MovementDetailCategoryOption,
  MovementDetailSelection,
  MovementDetailTagOption,
} from './movementDetailView.types';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';

type MovementDetailOverlayComponentProps = {
  required: {
    context: {
      core: TransactionsPort;
    };
    data: {
      selection: MovementDetailSelection | null;
      postedItems: TransactionHistoryItemView[];
      scheduledItems: ScheduledMovementView[];
      expectedItems: ExpectedMovementView[];
    };
  };
  provided: {
    commands: {
      refreshMovements: () => Promise<void>;
      voidPostedMovement?: (transactionId: string) => Promise<void>;
      confirm?: (message: string) => boolean;
    };
    events: {
      onClose: () => void;
      onError?: (error: { message: string }) => void;
      onVoided?: (transactionId: string) => void;
      onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
      onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
    };
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function MovementDetailOverlayComponent({ required, provided }: MovementDetailOverlayComponentProps) {
  const { core } = required.context;
  const { selection, postedItems, scheduledItems, expectedItems } = required.data;
  const [categories, setCategories] = useState<MovementDetailCategoryOption[]>([]);
  const [tags, setTags] = useState<MovementDetailTagOption[]>([]);
  const [error, setError] = useState('');
  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState<string>();
  const openedSelectionKeyRef = useRef<string | null>(null);

  function clearError() {
    setError('');
  }

  const reportError = useCallback((raw: unknown) => {
    const message = toErrorMessage(raw);
    setError(message);
    provided.events.onError?.({ message });
  }, [provided.events]);

  const fetchTaxonomy = useCallback(async () => Promise.all([
    core.taxonomyListCategories({ includeArchived: false }),
    core.taxonomyListTags({ includeArchived: false }),
  ]), [core]);

  function applyTaxonomy(
    nextCategories: MovementDetailCategoryOption[],
    nextTags: MovementDetailTagOption[],
  ) {
    setCategories(nextCategories);
    setTags(nextTags);
  }

  async function refreshDetailContext() {
    await provided.commands.refreshMovements();
    const [categoriesResult, tagsResult] = await fetchTaxonomy();
    applyTaxonomy(categoriesResult.items, tagsResult.items);
  }

  const detailModel = useMovementDetailModel({
    ports: {
      analytics: core,
      expected: core,
      scheduling: core,
      sharing: core,
      taxonomy: core,
    },
    postedItems,
    scheduledItems,
    expectedItems,
    categories,
    tags,
    refreshMovements: refreshDetailContext,
    requestVoid: (transactionId) => {
      const voidPostedMovement = provided.commands.voidPostedMovement;
      if (!voidPostedMovement) {
        return;
      }
      clearError();
      setPendingVoidTransactionId(transactionId);
      void voidPostedMovement(transactionId)
        .then(async () => {
          provided.events.onVoided?.(transactionId);
          await refreshDetailContext();
          provided.events.onClose();
        })
        .catch(reportError)
        .finally(() => {
          setPendingVoidTransactionId(undefined);
        });
    },
    pendingVoidTransactionId,
    clearError,
    reportError,
    clock: {
      now: () => new Date(),
    },
    confirm: provided.commands.confirm ?? ((message) => window.confirm(message)),
    onEditExpectedMovement: provided.events.onEditExpectedMovement,
    onPostExpectedMovement: provided.events.onPostExpectedMovement,
  });

  useEffect(() => {
    if (!selection) {
      return;
    }

    let cancelled = false;

    void fetchTaxonomy()
      .then(([categoriesResult, tagsResult]) => {
        if (cancelled) {
          return;
        }
        applyTaxonomy(categoriesResult.items, tagsResult.items);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        reportError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchTaxonomy, reportError, selection]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    const currentSelection = detailModel.state.selection;
    if (currentSelection?.id === selection.id && currentSelection.source === selection.source) {
      return;
    }

    if (selection.source === 'posted') {
      detailModel.actions.openPostedMovementDetail(selection.id);
      return;
    }
    if (selection.source === 'scheduled') {
      detailModel.actions.openScheduledMovementDetail(selection.id);
      return;
    }
    detailModel.actions.openExpectedMovementDetail(selection.id);
  }, [detailModel.actions, detailModel.state.selection, selection]);

  useEffect(() => {
    if (detailModel.state.selection) {
      openedSelectionKeyRef.current = `${detailModel.state.selection.source}:${detailModel.state.selection.id}`;
      return;
    }

    if (!openedSelectionKeyRef.current) {
      return;
    }

    openedSelectionKeyRef.current = null;
    provided.events.onClose();
  }, [detailModel.state.selection, provided.events]);

  if (!selection) {
    return null;
  }

  return (
    <>
      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}
      <MovementDetailView
        required={detailModel.required}
        provided={detailModel.provided}
      />
    </>
  );
}
