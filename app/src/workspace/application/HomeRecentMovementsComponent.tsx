import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { MovementsQueryPort } from '../../movements/application/movements.port';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import { buildPostedTimelineGroups } from '../../movements/application/monthlyMovementsTimeline';
import { MovementDetailOverlayComponent } from '../../movements/application/MovementDetailOverlayComponent';
import { mapTransactionHistoryList } from '../../transactions/application/transactionViewMappers';
import {
  HomeRecentMovementsView,
} from '../ui/HomeRecentMovements/HomeRecentMovementsView';

export type HomeRecentMovementsPort = TransactionsPort & Pick<MovementsQueryPort, 'movementsGetOverview' | 'movementsGetDetail'>;

export type HomeRecentMovementsComponentProps = {
  required: {
    context: {
      core: HomeRecentMovementsPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
      onSelectMovement?: (movement: TransactionHistoryItemView) => void;
      onSeeAll?: () => void;
    };
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

async function resolveRecentMovementTaxonomy(
  core: HomeRecentMovementsPort,
  transactions: LedgerTransactionListItem[],
): Promise<TransactionHistoryItemView[]> {
  const transactionIds = transactions.map((transaction) => transaction.id);
  if (transactionIds.length === 0) {
    return [];
  }

  try {
    const [accountsResult, categoriesResult, tagsResult, assignmentsResult] = await Promise.all([
      typeof core.ledgerListAccounts === 'function'
        ? core.ledgerListAccounts()
        : Promise.resolve({ items: [] }),
      core.taxonomyListCategories({ includeArchived: false }),
      core.taxonomyListTags({ includeArchived: false }),
      typeof core.orchestrationListTransactionTaxonomy === 'function'
        ? core.orchestrationListTransactionTaxonomy({ transactionIds })
        : Promise.resolve({ items: [] }),
    ]);
    const accountNameById = new Map(accountsResult.items.map((account) => [account.id, account.name] as const));
    const categoryNameById = new Map(categoriesResult.items.map((category) => [category.id, category.name] as const));
    const tagNameById = new Map(tagsResult.items.map((tag) => [tag.id, tag.name] as const));
    const assignmentByTransactionId = new Map(
      assignmentsResult.items.map((assignment) => [assignment.transactionId, assignment] as const),
    );

    return mapTransactionHistoryList(transactions.map((transaction) => {
      const assignment = assignmentByTransactionId.get(transaction.id);
      const categoryId = assignment?.categoryId ?? transaction.categoryId ?? transaction.category?.id;
      const categoryName = categoryId
        ? categoryNameById.get(categoryId) ?? transaction.category?.name
        : undefined;
      const existingTagsById = new Map((transaction.tags ?? []).map((tag) => [tag.id, tag.name] as const));
      const tagIds = assignment?.tagIds ?? (transaction.tags ?? []).map((tag) => tag.id);
      const tags = tagIds
        .map((tagId) => {
          const name = tagNameById.get(tagId) ?? existingTagsById.get(tagId);
          return name ? { id: tagId, name } : undefined;
        })
        .filter((tag): tag is { id: string; name: string } => tag != null);

      return {
        ...transaction,
        accountName: accountNameById.get(transaction.accountId) ?? transaction.accountName,
        categoryId,
        category: categoryId && categoryName ? { id: categoryId, name: categoryName } : undefined,
        tags,
      };
    }));
  } catch {
    return mapTransactionHistoryList(transactions);
  }
}

export function HomeRecentMovementsComponent({ required, provided }: HomeRecentMovementsComponentProps) {
  const { core } = required.context;
  const onError = provided?.events?.onError;
  const onSelectMovement = provided?.events?.onSelectMovement;
  const onSeeAll = provided?.events?.onSeeAll;
  const [movements, setMovements] = useState<TransactionHistoryItemView[]>([]);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const loadRecentMovements = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const overview = await core.movementsGetOverview({
        postedPagination: { page: 0, size: 3 },
        expectedPreviewSize: 0,
        scheduledPreviewSize: 0,
        sort: [{ field: 'occurredAt', direction: 'desc' }],
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      const postedTransactions = overview.postedPage.content as LedgerTransactionListItem[];
      const resolvedMovements = await resolveRecentMovementTaxonomy(core, postedTransactions);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMovements(resolvedMovements);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMovements([]);
      onError?.({ message: toErrorMessage(err) });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [core, onError]);

  useEffect(() => {
    if (!required.config.enabled) {
      requestIdRef.current += 1;
      setMovements([]);
      setSelectedMovementId(null);
      setLoading(false);
      return;
    }

    void loadRecentMovements();
  }, [loadRecentMovements, required.config.enabled, required.config.refreshSignal]);

  const postedGroups = useMemo(() => buildPostedTimelineGroups(movements), [movements]);
  function selectMovement(movementId: string) {
    const movement = movements.find((item) => item.id === movementId);
    if (movement) {
      setSelectedMovementId(movement.id);
      onSelectMovement?.(movement);
    }
  }

  return (
    <>
      <HomeRecentMovementsView
        required={{
          data: { groups: postedGroups },
          status: { loading },
        }}
        provided={{
          commands: {
            selectMovement,
            seeAll: () => onSeeAll?.(),
          },
        }}
      />

      {selectedMovementId ? (
        <MovementDetailOverlayComponent
          required={{
            context: {
              core: required.context.core,
            },
            data: {
              selection: { source: 'posted', id: selectedMovementId },
            },
          }}
          provided={{
            commands: {
              refreshMovements: loadRecentMovements,
              voidPostedMovement: async (transactionId) => {
                await core.ledgerVoidTransaction({ transactionId });
              },
            },
            events: {
              onClose: () => setSelectedMovementId(null),
              onError,
            },
          }}
        />
      ) : null}
    </>
  );
}
