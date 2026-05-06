import { MonthlyMovementsView } from '../ui/MonthlyMovementsView';
import { useMonthlyMovementsModel } from './useMonthlyMovementsModel';
import type { TransactionsCorePort } from '../../transactions/application/transactionsCore.port';
import type { ExpectedMovementView } from '../domain/movementsView.types';

export type MonthlyMovementsComponentProps = {
  required: {
    context: {
      accountId: string | null;
      core: TransactionsCorePort;
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
      onError?: (error: { message: string }) => void;
    };
  };
};

export function MonthlyMovementsComponent({ required, provided = {} }: MonthlyMovementsComponentProps) {
  const model = useMonthlyMovementsModel({
    core: required.context.core,
    accountId: required.context.accountId,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    onVoided: provided.events?.onVoided,
    onExpectedPosted: provided.events?.onExpectedPosted,
    onExpectedDismissed: provided.events?.onExpectedDismissed,
    onPostExpectedMovement: provided.events?.onPostExpectedMovement,
    onEditExpectedMovement: provided.events?.onEditExpectedMovement,
    onError: provided.events?.onError,
  });

  if (!required.config.enabled || !required.context.accountId) {
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
