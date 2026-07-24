import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import type { MovementDetailQueryPort } from './movements.port';
import { MovementDetailView } from '../ui/MovementDetail/MovementDetailView';
import { useMovementDetailModel } from './useMovementDetailModel';
import type {
  MovementDetailCategoryOption,
  MovementDetailSelection,
  MovementDetailTagOption,
} from './movementDetailView.types';
import type { ExpectedMovementView } from './movementsView.types';

type MovementDetailOverlayComponentProps = {
  required: {
    context: {
      core: TransactionsPort & MovementDetailQueryPort;
    };
    data: {
      selection: MovementDetailSelection | null;
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
  const { selection } = required.data;
  const [categories, setCategories] = useState<MovementDetailCategoryOption[]>([]);
  const [tags, setTags] = useState<MovementDetailTagOption[]>([]);
  const [error, setError] = useState('');
  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState<string>();
  const openedSelectionKeyRef = useRef<string | null>(null);
  const onClose = provided.events.onClose;
  const onError = provided.events.onError;

  function clearError() {
    setError('');
  }

  const reportError = useCallback((raw: unknown) => {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }, [onError]);

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
      movements: core,
      analytics: core,
      expected: core,
      scheduling: core,
      sharing: core,
      taxonomy: core,
    },
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

  const openPostedMovementDetail = detailModel.actions.openPostedMovementDetail;
  const openScheduledMovementDetail = detailModel.actions.openScheduledMovementDetail;
  const openExpectedMovementDetail = detailModel.actions.openExpectedMovementDetail;
  const detailSelection = detailModel.state.selection;

  useEffect(() => {
    if (!selection) {
      return;
    }

    const currentSelection = detailSelection;
    if (currentSelection?.id === selection.id && currentSelection.source === selection.source) {
      return;
    }

    if (selection.source === 'posted') {
      openPostedMovementDetail(selection.id);
      return;
    }
    if (selection.source === 'scheduled') {
      openScheduledMovementDetail(selection.id);
      return;
    }
    openExpectedMovementDetail(selection.id);
  }, [detailSelection, openExpectedMovementDetail, openPostedMovementDetail, openScheduledMovementDetail, selection]);

  useEffect(() => {
    if (detailModel.state.selection) {
      openedSelectionKeyRef.current = `${detailModel.state.selection.source}:${detailModel.state.selection.id}`;
      return;
    }

    if (!openedSelectionKeyRef.current) {
      return;
    }

    openedSelectionKeyRef.current = null;
    onClose();
  }, [detailModel.state.selection, onClose]);

  if (!selection) {
    return null;
  }

  if (!detailModel.required.data.movement) {
    return <div role="status" className="movement-detail-loading">Loading movement details...</div>;
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
