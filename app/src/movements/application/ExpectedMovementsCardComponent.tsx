import { useEffect, useMemo, useState } from 'react';
import type { AccountBalancesPort } from '../../account/application/accountBalances.port';
import type { ExpectedPort } from '../../expected/application/expected.port';
import { ExpectedMovementsCardView } from '../ui/ExpectedMovementsCard/ExpectedMovementsCardView';
import { MovementDetailSheetView } from '../ui/MovementDetailSheet/MovementDetailSheetView';
import type { ExpectedMovementView } from './movementsView.types';
import {
  buildExpectedMovementDetailData,
  buildExpectedMovementRowData,
} from '../ui/MonthlyMovements/monthlyMovementPresentation';

export type ExpectedMovementsCardPort = Pick<AccountBalancesPort, 'accountsListBalances'>
  & Pick<ExpectedPort, 'expectedListMovements' | 'expectedDismissMovement'>;

export type ExpectedMovementsCardComponentProps = {
  required: {
    context: {
      core: ExpectedMovementsCardPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
      onExpectedDismissed?: () => void;
      onPostExpectedMovement?: (movement: ExpectedMovementView) => void;
      onEditExpectedMovement?: (movement: ExpectedMovementView) => void;
    };
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function sortExpectedMovements(items: ExpectedMovementView[]): ExpectedMovementView[] {
  return [...items].sort((left, right) => {
    const dateComparison = right.expectedAt.localeCompare(left.expectedAt);
    return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
  });
}

export function ExpectedMovementsCardComponent({ required, provided }: ExpectedMovementsCardComponentProps) {
  const { core } = required.context;
  const [movements, setMovements] = useState<ExpectedMovementView[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<ExpectedMovementView | null>(null);
  const [pendingDismissExpectedId, setPendingDismissExpectedId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!required.config.enabled) {
      setMovements([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const accountsResult = await core.accountsListBalances();
        const activeAccounts = accountsResult.items.filter((account) => account.status === 'active');
        const accountNameById = new Map(activeAccounts.map((account) => [account.accountId, account.name] as const));
        const expectedResults = await Promise.all(
          activeAccounts.map((account) => core.expectedListMovements({ accountId: account.accountId })),
        );
        const nextMovements = sortExpectedMovements(
          expectedResults.flatMap((result) => result.items).map((movement) => ({
            ...movement,
            accountName: accountNameById.get(movement.accountId),
          })),
        );
        if (!cancelled) {
          setMovements(nextMovements);
        }
      } catch (err) {
        if (!cancelled) {
          setMovements([]);
          provided?.events?.onError?.({ message: toErrorMessage(err) });
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
    };
  }, [core, required.config.enabled, required.config.refreshSignal]);

  const rows = useMemo(
    () => movements.map((movement) => ({
      id: movement.id,
      row: buildExpectedMovementRowData(movement),
    })),
    [movements],
  );

  function selectMovement(movementId: string) {
    const movement = movements.find((item) => item.id === movementId);
    if (movement) {
      setSelectedMovement(movement);
    }
  }

  async function dismissSelectedMovement() {
    if (!selectedMovement) {
      return;
    }
    setPendingDismissExpectedId(selectedMovement.id);
    try {
      await core.expectedDismissMovement({ expectedMovementId: selectedMovement.id });
      setMovements((previous) => previous.filter((movement) => movement.id !== selectedMovement.id));
      setSelectedMovement(null);
      provided?.events?.onExpectedDismissed?.();
    } catch (err) {
      provided?.events?.onError?.({ message: toErrorMessage(err) });
    } finally {
      setPendingDismissExpectedId('');
    }
  }

  return (
    <>
      <ExpectedMovementsCardView
        required={{
          config: {},
          data: { movements: rows },
          state: {},
          status: { loading },
        }}
        provided={{ commands: { selectMovement } }}
      />

      {selectedMovement ? (
        <MovementDetailSheetView
          required={{
            config: {
              ariaLabel: 'Expected movement details',
              closeLabel: 'Close expected movement details',
            },
            data: {
              ...buildExpectedMovementDetailData(selectedMovement),
              actions: [
                {
                  key: 'post',
                  label: 'Post movement',
                  onClick: () => {
                    provided?.events?.onPostExpectedMovement?.(selectedMovement);
                    setSelectedMovement(null);
                  },
                },
                {
                  key: 'edit',
                  label: 'Edit expected',
                  variant: 'text',
                  onClick: () => {
                    provided?.events?.onEditExpectedMovement?.(selectedMovement);
                    setSelectedMovement(null);
                  },
                },
                {
                  key: 'remove',
                  label: pendingDismissExpectedId === selectedMovement.id ? 'Removing...' : 'Remove movement',
                  variant: 'text-danger',
                  disabled: pendingDismissExpectedId === selectedMovement.id,
                  onClick: () => {
                    void dismissSelectedMovement();
                  },
                },
                {
                  key: 'close',
                  label: 'Close',
                  variant: 'text',
                  onClick: () => setSelectedMovement(null),
                },
              ],
            },
            state: { open: true },
            status: { disabled: Boolean(pendingDismissExpectedId) },
          }}
          provided={{ commands: { close: () => setSelectedMovement(null) } }}
        />
      ) : null}
    </>
  );
}
