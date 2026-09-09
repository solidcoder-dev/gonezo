import { useMemo } from 'react';
import { createExpectedGateway } from '../../expected/application/expectedGateway';
import { createSchedulingGateway } from '../../scheduling/application/schedulingGateway';
import { createSharingGateway } from '../../sharing/application/sharingGateway';
import { createTaxonomyGateway } from '../../taxonomy/application/taxonomyGateway';
import { MonthlyMovementsView } from '../ui/MonthlyMovements/MonthlyMovementsView';
import { useMonthlyMovementsModel } from './useMonthlyMovementsModel';
import type { TransactionsPort } from '../../transactions/application/transactions.port';
import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { LedgerTransactionOperationsPort } from '../../ledger/application/useLedgerTransactions';
import type { MovementDetailQueryPort } from './movements.port';
import type { ExpectedMovementView } from './movementsView.types';
import type { MovementDetailViewModel } from './movementDetailView.types';
import type { FeedbackNoticeInput, FeedbackNoticeUpdate } from '../../shared/ui/FeedbackNotice/feedbackNotice.types';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';

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
      core: Omit<TransactionsPort, keyof LedgerPort> & Pick<LedgerPort, 'ledgerListAccounts'> & LedgerTransactionOperationsPort & MovementDetailQueryPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
      amountVisibility?: AmountVisibility;
    };
  };
  provided?: {
    events?: {
      onVoided?: (transactionId: string) => void;
      onExpectedDismissed?: () => void;
      onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
      onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
      onDuplicateMovement?: (movement: MovementDetailViewModel) => void;
      onNotice?: (notice: FeedbackNoticeInput) => string;
      onNoticeUpdated?: (id: string, update: FeedbackNoticeUpdate) => void;
      onNoticeClosed?: (id: string) => void;
    };
  };
};

export function MonthlyMovementsComponent({ required, provided = {} }: MonthlyMovementsComponentProps) {
  const ports = useMemo(() => ({
    analytics: required.context.core,
    movements: required.context.core,
    ledger: required.context.core,
    scheduling: createSchedulingGateway(required.context.core),
    expected: createExpectedGateway(required.context.core),
    sharing: createSharingGateway(required.context.core),
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
    onExpectedDismissed: provided.events?.onExpectedDismissed,
    onPostExpectedMovement: provided.events?.onPostExpectedMovement,
    onEditExpectedMovement: provided.events?.onEditExpectedMovement,
    onDuplicateMovement: provided.events?.onDuplicateMovement,
    onNotice: provided.events?.onNotice,
    onNoticeUpdated: provided.events?.onNoticeUpdated,
    onNoticeClosed: provided.events?.onNoticeClosed,
    confirm: (message) => window.confirm(message),
  });

  if (!required.config.enabled || ((required.context.scope ?? 'account') === 'account' && !required.context.accountId)) {
    return null;
  }

  return (
    <>
      {model.error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {model.error}
        </div>
      ) : null}

      <MonthlyMovementsView required={{ ...model.required, amountVisibility: required.config.amountVisibility }} provided={model.provided} />
    </>
  );
}
