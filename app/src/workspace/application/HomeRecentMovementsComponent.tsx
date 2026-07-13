import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MovementsQueryPort } from '../../movements/application/movements.port';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { MovementDetailOverlayComponent } from '../../movements/application/MovementDetailOverlayComponent';
import {
  HomeRecentMovementsView,
  type HomeRecentMovementRowView,
} from '../ui/HomeRecentMovements/HomeRecentMovementsView';

export type HomeRecentMovementsPort = TransactionsPort & Pick<MovementsQueryPort, 'movementsGetOverview'>;

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

function movementTone(type: TransactionHistoryItemView['type']): HomeRecentMovementRowView['amountTone'] {
  if (type === 'income') {
    return 'income';
  }
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') {
    return 'transfer';
  }
  return 'expense';
}

function movementIconClass(type: TransactionHistoryItemView['type']): string {
  if (type === 'income') {
    return 'bi bi-arrow-down-left';
  }
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') {
    return 'bi bi-arrow-left-right';
  }
  return 'bi bi-arrow-up-right';
}

function movementAmountSign(type: TransactionHistoryItemView['type']): string {
  if (type === 'income' || type === 'transfer_in') {
    return '+';
  }
  if (type === 'expense' || type === 'transfer_out') {
    return '-';
  }
  return '';
}

function movementTitle(movement: TransactionHistoryItemView): string {
  if (movement.merchant) {
    return movement.merchant;
  }
  if (movement.description) {
    return movement.description;
  }
  if (movement.type === 'income') {
    return 'Income';
  }
  if (movement.type === 'transfer' || movement.type === 'transfer_in' || movement.type === 'transfer_out') {
    return 'Transfer';
  }
  return 'Expense';
}

function shortDateLabel(dateIso: string): string {
  try {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return dateIso.slice(0, 10);
    }
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date);
  } catch {
    return dateIso.slice(0, 10);
  }
}

function absoluteAmountLabel(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return formatCurrencyAmount(amount, currency);
  }
  return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
}

function buildHomeRecentMovementRow(movement: TransactionHistoryItemView): HomeRecentMovementRowView {
  return {
    id: movement.id,
    title: movementTitle(movement),
    subtitle: [movement.accountName, shortDateLabel(movement.occurredAt)].filter(Boolean).join(' · '),
    iconClassName: movementIconClass(movement.type),
    amountLabel: `${movementAmountSign(movement.type)}${absoluteAmountLabel(movement.amount, movement.currency)}`,
    amountTone: movementTone(movement.type),
    ignored: movement.ignored,
  };
}

export function HomeRecentMovementsComponent({ required, provided }: HomeRecentMovementsComponentProps) {
  const [movements, setMovements] = useState<TransactionHistoryItemView[]>([]);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const loadRecentMovements = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    try {
      const overview = await required.context.core.movementsGetOverview({
        postedPagination: { page: 0, size: 3 },
        expectedPreviewSize: 0,
        scheduledPreviewSize: 0,
        sort: [{ field: 'occurredAt', direction: 'desc' }],
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMovements(overview.postedPage.content as TransactionHistoryItemView[]);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setMovements([]);
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [provided, required.context.core]);

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

  const rows = useMemo(() => movements.map(buildHomeRecentMovementRow), [movements]);
  function selectMovement(movementId: string) {
    const movement = movements.find((item) => item.id === movementId);
    if (movement) {
      setSelectedMovementId(movement.id);
      provided?.events?.onSelectMovement?.(movement);
    }
  }

  return (
    <>
      <HomeRecentMovementsView
        required={{
          data: { movements: rows },
          status: { loading },
        }}
        provided={{
          commands: {
            selectMovement,
            seeAll: () => provided?.events?.onSeeAll?.(),
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
              postedItems: movements,
              scheduledItems: [],
              expectedItems: [],
            },
          }}
          provided={{
            commands: {
              refreshMovements: loadRecentMovements,
              voidPostedMovement: async (transactionId) => {
                await required.context.core.ledgerVoidTransaction({ transactionId });
              },
            },
            events: {
              onClose: () => setSelectedMovementId(null),
              onError: provided?.events?.onError,
            },
          }}
        />
      ) : null}
    </>
  );
}
