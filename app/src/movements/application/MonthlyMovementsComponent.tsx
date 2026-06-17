import { useMemo } from 'react';
import { createExpectedGateway } from '../../expected/application/expectedGateway';
import { createLedgerGateway } from '../../ledger/application/ledgerGateway';
import { createSchedulingGateway } from '../../scheduling/application/schedulingGateway';
import { createTaxonomyGateway } from '../../taxonomy/application/taxonomyGateway';
import { MonthlyMovementsView } from '../ui/MonthlyMovements/MonthlyMovementsView';
import { useMonthlyMovementsModel } from './useMonthlyMovementsModel';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';

const BROWSER_CLOCK = {
  now: () => new Date(),
};

const BROWSER_TIMERS = {
  setTimeout: (handler: () => void, timeoutMs: number) => window.setTimeout(handler, timeoutMs),
  clearTimeout: (timerId: number) => window.clearTimeout(timerId),
};

export type MonthlyMovementsComponentProps = {
  required: {
    context: {
      accountId: string | null;
      scope?: 'account' | 'all';
      core: TransactionsPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onVoided?: (transactionId: string) => void;
      onExpectedPosted?: () => void;
      onExpectedDismissed?: () => void;
      onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
      onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
      onEditScheduledMovement?: (movement: ScheduledMovementView, categoryName?: string) => void;
      onError?: (error: { message: string }) => void;
    };
  };
};

export function MonthlyMovementsComponent({ required, provided = {} }: MonthlyMovementsComponentProps) {
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(required.context.core),
    scheduling: createSchedulingGateway(required.context.core),
    expected: createExpectedGateway(required.context.core),
    taxonomy: createTaxonomyGateway(required.context.core),
  }), [required.context.core]);
  const model = useMonthlyMovementsModel({
    ports,
    accountId: required.context.accountId,
    scope: required.context.scope ?? 'account',
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    clock: BROWSER_CLOCK,
    timers: BROWSER_TIMERS,
    onVoided: provided.events?.onVoided,
    onExpectedPosted: provided.events?.onExpectedPosted,
    onExpectedDismissed: provided.events?.onExpectedDismissed,
    onPostExpectedMovement: provided.events?.onPostExpectedMovement,
    onEditExpectedMovement: provided.events?.onEditExpectedMovement,
    onEditScheduledMovement: provided.events?.onEditScheduledMovement,
    onError: provided.events?.onError,
  });

  if (!required.config.enabled || ((required.context.scope ?? 'account') === 'account' && !required.context.accountId)) {
    return null;
  }

  return (
    <>
      {model.error ? (
        <div className="banner error" role="alert">
          {model.error}
        </div>
      ) : null}

      {model.toast.message ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{model.toast.message}</span>
          {model.toast.actionLabel ? (
            <button type="button" className="text-button" onClick={model.toast.runAction}>
              {model.toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={model.toast.dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}

      <MonthlyMovementsView required={model.required} provided={model.provided} />
    </>
  );
}
